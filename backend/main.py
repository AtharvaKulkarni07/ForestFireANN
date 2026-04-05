"""
Forest Fire Burned Area Predictor — FastAPI Backend
Serves the Keras ANN model for predictions and provides dataset/EDA endpoints.
"""

import os
import json
import pickle
from pathlib import Path
from typing import List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import tensorflow as tf
from tensorflow import keras

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # project root

MODEL_PATH    = BASE_DIR / "forest_fire_model.keras"
SCALER_PATH   = BASE_DIR / "scaler.pkl"
ENCODER_PATH  = BASE_DIR / "label_encoders.pkl"
META_PATH     = BASE_DIR / "model_metadata.json"
DATA_PATH     = BASE_DIR / "forestfires.csv"

# ── Load artefacts at startup ─────────────────────────────────────────────────
REQUIRED = [MODEL_PATH, SCALER_PATH, ENCODER_PATH, META_PATH, DATA_PATH]
missing = [str(p) for p in REQUIRED if not p.exists()]
if missing:
    raise FileNotFoundError(f"Missing required artefacts: {missing}")

model = keras.models.load_model(str(MODEL_PATH))
with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)
with open(ENCODER_PATH, "rb") as f:
    encoders = pickle.load(f)
with open(META_PATH, "r") as f:
    meta = json.load(f)
df = pd.read_csv(str(DATA_PATH))

FEATURES    = meta["features"]
MONTH_ORDER = encoders["month"]
DAY_ORDER   = encoders["day"]

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Forest Fire Burned Area Predictor API",
    version="1.0.0",
    description="ANN-powered prediction API for forest fire burned area estimation",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class PredictionInput(BaseModel):
    X: int = Field(..., ge=1, le=9, description="East spatial coordinate")
    Y: int = Field(..., ge=2, le=9, description="North spatial coordinate")
    month: str = Field(..., description="Month of the year (e.g. 'aug')")
    day: str = Field(..., description="Day of week (e.g. 'fri')")
    FFMC: float = Field(..., ge=18.7, le=96.2)
    DMC: float = Field(..., ge=1.1, le=291.3)
    DC: float = Field(..., ge=7.9, le=860.6)
    ISI: float = Field(..., ge=0.0, le=56.1)
    temp: float = Field(..., ge=2.2, le=33.3)
    RH: int = Field(..., ge=15, le=100)
    wind: float = Field(..., ge=0.4, le=9.4)
    rain: float = Field(..., ge=0.0, le=6.4)


class PredictionResult(BaseModel):
    predicted_area_ha: float
    log_prediction: float
    risk_level: str
    risk_emoji: str
    interpretation: str
    input_features: dict


class MetadataResponse(BaseModel):
    features: list
    metrics: dict
    best_hyperparameters: dict
    training_epochs: int
    preprocessing: dict
    n_train: int
    n_test: int


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "Forest Fire Predictor API is running"}


@app.get("/api/metadata", response_model=MetadataResponse)
def get_metadata():
    """Return model metadata, metrics, and hyperparameters."""
    return MetadataResponse(
        features=meta["features"],
        metrics=meta["metrics"],
        best_hyperparameters=meta.get("best_hyperparameters", {}),
        training_epochs=meta["training_epochs"],
        preprocessing=meta.get("preprocessing", {}),
        n_train=meta["n_train"],
        n_test=meta["n_test"],
    )


@app.get("/api/encoders")
def get_encoders():
    """Return the month/day encodings so the frontend can build selectors."""
    return {
        "months": MONTH_ORDER,
        "days": DAY_ORDER,
    }


@app.post("/api/predict", response_model=PredictionResult)
def predict(inp: PredictionInput):
    """Run prediction through the ANN model."""
    if inp.month not in MONTH_ORDER:
        raise HTTPException(400, f"Invalid month '{inp.month}'. Must be one of {MONTH_ORDER}")
    if inp.day not in DAY_ORDER:
        raise HTTPException(400, f"Invalid day '{inp.day}'. Must be one of {DAY_ORDER}")

    month_enc = MONTH_ORDER.index(inp.month) + 1
    day_enc   = DAY_ORDER.index(inp.day)

    raw = np.array([[inp.X, inp.Y, month_enc, day_enc,
                     inp.FFMC, inp.DMC, inp.DC, inp.ISI,
                     inp.temp, inp.RH, inp.wind, inp.rain]])
    raw_scaled = scaler.transform(raw)
    log_pred   = float(model.predict(raw_scaled, verbose=0)[0][0])
    area_pred  = float(np.expm1(log_pred))

    # Risk category
    if area_pred < 1:
        risk, emoji = "Low", "🟢"
    elif area_pred < 25:
        risk, emoji = "Moderate", "🟡"
    else:
        risk, emoji = "High", "🔴"

    interpretation = (
        f"A predicted area of {area_pred:.2f} ha "
        f"({'≈ a football pitch' if area_pred < 1 else '≈ ' + str(int(area_pred)) + ' football pitches'}). "
        f"The dataset mean is 12.85 ha."
    )

    return PredictionResult(
        predicted_area_ha=round(area_pred, 4),
        log_prediction=round(log_pred, 4),
        risk_level=risk,
        risk_emoji=emoji,
        interpretation=interpretation,
        input_features={f: float(v) for f, v in zip(FEATURES, raw[0])},
    )


# ── EDA endpoints ─────────────────────────────────────────────────────────────
@app.get("/api/eda/area-distribution")
def eda_area_distribution():
    """Histogram data for log1p(area)."""
    log_area = np.log1p(df["area"]).tolist()
    return {"values": log_area}


@app.get("/api/eda/fires-by-month")
def eda_fires_by_month():
    """Fire count per month (ordered)."""
    counts = df.groupby("month")["area"].count().reindex(MONTH_ORDER).fillna(0)
    return {
        "months": MONTH_ORDER,
        "labels": ["J","F","M","A","M","J","J","A","S","O","N","D"],
        "counts": counts.values.tolist(),
    }


@app.get("/api/eda/correlation")
def eda_correlation():
    """Correlation matrix of numeric columns."""
    cols = ["FFMC","DMC","DC","ISI","temp","RH","wind","rain","area"]
    corr = df[cols].corr().round(4)
    return {
        "columns": cols,
        "matrix": corr.values.tolist(),
    }


@app.get("/api/eda/temp-vs-area")
def eda_temp_vs_area():
    """Scatter data: temp vs log1p(area), coloured by wind."""
    return {
        "temp": df["temp"].tolist(),
        "log_area": np.log1p(df["area"]).tolist(),
        "wind": df["wind"].tolist(),
    }


@app.get("/api/eda/statistics")
def eda_statistics():
    """Descriptive statistics of the full dataset."""
    desc = df.describe().round(4)
    return {
        "columns": desc.columns.tolist(),
        "index": desc.index.tolist(),
        "data": desc.values.tolist(),
    }


@app.get("/api/eda/area-raw-vs-log")
def eda_area_raw_vs_log():
    """Raw area and log1p area values for histogram comparison."""
    return {
        "raw_area": df["area"].tolist(),
        "log_area": np.log1p(df["area"]).tolist(),
    }


# ── Dataset endpoints ─────────────────────────────────────────────────────────
@app.get("/api/dataset")
def get_dataset(months: Optional[str] = Query(None, description="Comma-separated month filter")):
    """Return the full dataset, optionally filtered by month."""
    filtered = df.copy()
    if months:
        month_list = [m.strip() for m in months.split(",")]
        filtered = filtered[filtered["month"].isin(month_list)]

    return {
        "total_records": len(filtered),
        "total_columns": len(filtered.columns),
        "columns": filtered.columns.tolist(),
        "data": filtered.to_dict(orient="records"),
    }


@app.get("/api/dataset/column-descriptions")
def get_column_descriptions():
    """Return column metadata for the dataset."""
    return {
        "columns": [
            {"name": "X",    "type": "int",   "description": "X-axis spatial coordinate (1–9)"},
            {"name": "Y",    "type": "int",   "description": "Y-axis spatial coordinate (2–9)"},
            {"name": "month","type": "str",   "description": "Month of year (jan–dec)"},
            {"name": "day",  "type": "str",   "description": "Day of week (mon–sun)"},
            {"name": "FFMC", "type": "float", "description": "Fine Fuel Moisture Code — surface moisture"},
            {"name": "DMC",  "type": "float", "description": "Duff Moisture Code — upper organic layer"},
            {"name": "DC",   "type": "float", "description": "Drought Code — deep organic layer"},
            {"name": "ISI",  "type": "float", "description": "Initial Spread Index — rate of spread"},
            {"name": "temp", "type": "float", "description": "Temperature (°C)"},
            {"name": "RH",   "type": "int",   "description": "Relative Humidity (%)"},
            {"name": "wind", "type": "float", "description": "Wind speed (km/h)"},
            {"name": "rain", "type": "float", "description": "Outside rain (mm/m²)"},
            {"name": "area", "type": "float", "description": "TARGET: Burned area (ha)"},
        ]
    }
