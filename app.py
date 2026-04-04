"""
Forest Fire Burned Area Prediction — Streamlit App
====================================================
Run locally:
    streamlit run app.py

Deploy to Streamlit Cloud:
    1. Push this repo to GitHub (include requirements.txt)
    2. Go to https://share.streamlit.io → New app → select repo
    3. Set Main file path: app.py

Required files in the same folder:
    forest_fire_model.keras
    scaler.pkl
    label_encoders.pkl
    model_metadata.json
    forestfires.csv
"""

import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use("Agg")
import seaborn as sns
import pickle
import json
import os

import tensorflow as tf
from tensorflow import keras

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Forest Fire Predictor",
    page_icon="🔥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .main-title {
        font-size: 2.6rem; font-weight: 800;
        background: linear-gradient(135deg, #e74c3c, #e67e22);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    .subtitle { color: #7f8c8d; font-size: 1.1rem; margin-bottom: 1.5rem; }
    .metric-card {
        background: #1e1e2e; border-radius: 12px;
        padding: 1rem 1.4rem; text-align: center;
        border: 1px solid #2d2d3f;
    }
    .metric-card .label { font-size: 0.82rem; color: #aaa; letter-spacing: 1px; }
    .metric-card .value { font-size: 1.9rem; font-weight: 700; color: #fff; }
    .predict-box {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 16px; padding: 2rem;
        border: 1px solid #e74c3c44;
    }
    .result-high { color: #e74c3c; font-size: 2rem; font-weight: 800; }
    .result-low  { color: #2ecc71; font-size: 2rem; font-weight: 800; }
    .result-med  { color: #f39c12; font-size: 2rem; font-weight: 800; }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px 8px 0 0;
        padding: 0.5rem 1.2rem;
    }
</style>
""", unsafe_allow_html=True)


# ── Load artefacts (cached) ───────────────────────────────────────────────────
@st.cache_resource
def load_model():
    return keras.models.load_model("forest_fire_model.keras")

@st.cache_resource
def load_scaler():
    with open("scaler.pkl", "rb") as f:
        return pickle.load(f)

@st.cache_resource
def load_encoders():
    with open("label_encoders.pkl", "rb") as f:
        return pickle.load(f)

@st.cache_data
def load_metadata():
    with open("model_metadata.json", "r") as f:
        return json.load(f)

@st.cache_data
def load_data():
    return pd.read_csv("forestfires.csv")


# ── Check files exist ─────────────────────────────────────────────────────────
REQUIRED = ["forest_fire_model.keras", "scaler.pkl",
            "label_encoders.pkl", "model_metadata.json"]
missing = [f for f in REQUIRED if not os.path.exists(f)]

if missing:
    st.error(f"❌ Missing files: {missing}")
    st.info("Run `train_model.py` in Colab, download the artefacts, and place them here.")
    st.stop()

model    = load_model()
scaler   = load_scaler()
encoders = load_encoders()
meta     = load_metadata()
df       = load_data()
FEATURES = meta["features"]

MONTH_ORDER = encoders["month"]
DAY_ORDER   = encoders["day"]


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://img.icons8.com/fluency/96/fire-element.png", width=70)
    st.markdown("## 🔥 Forest Fire Predictor")
    st.markdown("Predict burned area using an **ANN** trained on the UCI Forest Fires dataset.")
    st.divider()
    st.markdown("**Model Performance**")
    m = meta["metrics"]
    st.metric("R² (log-space)", f"{m['r2_log']:.4f}")
    st.metric("MAE (ha)",       f"{m['mae_ha']:.2f} ha")
    st.metric("RMSE (ha)",      f"{m['rmse_ha']:.2f} ha")
    st.divider()
    st.markdown("**Training Info**")
    st.write(f"- Epochs trained: **{meta['training_epochs']}**")
    st.write(f"- Target transform: **log1p(area)**")
    hp = meta.get("best_hyperparameters", {})
    if hp:
        st.write(f"- Best LR: **{hp.get('learning_rate', '–')}**")
        st.write(f"- Layers: **{hp.get('n_layers', '–')}**")
    st.divider()
    st.caption("Dataset: [UCI Forest Fires](https://archive.ics.uci.edu/ml/datasets/forest+fires)")


# ── Header ────────────────────────────────────────────────────────────────────
st.markdown('<div class="main-title">🔥 Forest Fire Burned Area Predictor</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle">Deep Learning (ANN) · Montesinho Natural Park, Portugal</div>', unsafe_allow_html=True)

tab1, tab2, tab3, tab4 = st.tabs(["🎯 Predict", "📊 EDA", "🧠 Model Info", "📋 Dataset"])


# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — PREDICTION
# ══════════════════════════════════════════════════════════════════════════════
with tab1:
    st.markdown("### Enter Fire Conditions")
    st.markdown("Adjust the inputs below and click **Predict** to estimate the burned area.")

    with st.container():
        col1, col2, col3 = st.columns(3)

        with col1:
            st.markdown("**📍 Location & Time**")
            X_coord = st.slider("X – East coord (1–9)",   1, 9, 5)
            Y_coord = st.slider("Y – North coord (2–9)",  2, 9, 4)
            month   = st.selectbox("Month", MONTH_ORDER, index=7)  # aug default
            day     = st.selectbox("Day of week", DAY_ORDER, index=4)  # fri

        with col2:
            st.markdown("**🌡️ Weather Conditions**")
            temp = st.slider("Temperature (°C)",   2.2, 33.3, 22.0, step=0.1)
            RH   = st.slider("Relative Humidity (%)", 15, 100, 40)
            wind = st.slider("Wind Speed (km/h)",  0.4, 9.4, 4.0, step=0.1)
            rain = st.slider("Rain (mm/m²)",       0.0, 6.4, 0.0, step=0.1)

        with col3:
            st.markdown("**🔥 Fire Weather Indices (FWI)**")
            FFMC = st.slider("FFMC", 18.7, 96.2, 90.6, step=0.1,
                             help="Fine Fuel Moisture Code — moisture in litter")
            DMC  = st.slider("DMC",  1.1, 291.3, 110.9, step=0.1,
                             help="Duff Moisture Code")
            DC   = st.slider("DC",   7.9, 860.6, 547.9, step=1.0,
                             help="Drought Code — deep organic layer moisture")
            ISI  = st.slider("ISI",  0.0, 56.1,  9.0, step=0.1,
                             help="Initial Spread Index — rate of fire spread")

    st.divider()

    if st.button("🔥 Predict Burned Area", use_container_width=True, type="primary"):

        # Build feature vector
        month_enc = MONTH_ORDER.index(month) + 1
        day_enc   = DAY_ORDER.index(day)

        raw = np.array([[X_coord, Y_coord, month_enc, day_enc,
                         FFMC, DMC, DC, ISI, temp, RH, wind, rain]])
        raw_scaled = scaler.transform(raw)

        log_pred = model.predict(raw_scaled, verbose=0)[0][0]
        area_pred = float(np.expm1(log_pred))

        # Risk category
        if area_pred < 1:
            risk, cls, emoji = "Low", "result-low",  "🟢"
        elif area_pred < 25:
            risk, cls, emoji = "Moderate", "result-med",  "🟡"
        else:
            risk, cls, emoji = "High", "result-high", "🔴"

        # Results
        r1, r2, r3 = st.columns(3)
        with r1:
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">PREDICTED BURNED AREA</div>
                <div class="{cls}">{area_pred:.2f} ha</div>
            </div>""", unsafe_allow_html=True)
        with r2:
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">RISK LEVEL</div>
                <div class="{cls}">{emoji} {risk}</div>
            </div>""", unsafe_allow_html=True)
        with r3:
            st.markdown(f"""
            <div class="metric-card">
                <div class="label">LOG₁₊ PREDICTION</div>
                <div class="value" style="color:#aaa">{log_pred:.4f}</div>
            </div>""", unsafe_allow_html=True)

        st.markdown("")

        # Context gauge
        st.markdown(f"**Interpretation:** A predicted area of **{area_pred:.2f} ha** "
                    f"({'≈ a football pitch' if area_pred < 1 else '≈ ' + str(int(area_pred)) + ' football pitches'}). "
                    f"The dataset mean is **12.85 ha**.")

        # Feature contribution display
        with st.expander("📌 Input Summary"):
            inp_df = pd.DataFrame({
                "Feature": FEATURES,
                "Value":   raw[0]
            })
            st.dataframe(inp_df, use_container_width=True, hide_index=True)

        # Confidence note
        st.info("ℹ️ This model is trained on 517 records. Predictions are indicative — "
                "the Forest Fires dataset is known to be challenging for regression models.")


# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — EDA
# ══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.markdown("### Exploratory Data Analysis")

    c1, c2 = st.columns(2)

    with c1:
        # Area distribution
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.hist(np.log1p(df["area"]), bins=35, color="#3498db", edgecolor="white", alpha=0.85)
        ax.set_title("Burned Area Distribution (log1p)", fontweight="bold")
        ax.set_xlabel("log(1 + Area)"); ax.set_ylabel("Frequency")
        ax.grid(alpha=0.3)
        st.pyplot(fig); plt.close()

    with c2:
        # Fire count by month
        month_order_idx = {m: i for i, m in enumerate(MONTH_ORDER)}
        month_counts = df.groupby("month")["area"].count().reindex(MONTH_ORDER)
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.bar(range(12), month_counts.values, color="#e74c3c", edgecolor="white", alpha=0.85)
        ax.set_xticks(range(12))
        ax.set_xticklabels(["J","F","M","A","M","J","J","A","S","O","N","D"])
        ax.set_title("Fire Count by Month", fontweight="bold")
        ax.set_ylabel("Number of Fires"); ax.grid(alpha=0.3, axis="y")
        st.pyplot(fig); plt.close()

    c3, c4 = st.columns(2)

    with c3:
        # Correlation heatmap
        corr_cols = ["FFMC","DMC","DC","ISI","temp","RH","wind","rain","area"]
        corr = df[corr_cols].corr()
        fig, ax = plt.subplots(figsize=(7, 5))
        sns.heatmap(corr, ax=ax, cmap="coolwarm", annot=True, fmt=".2f",
                    linewidths=0.5, annot_kws={"size": 8})
        ax.set_title("Feature Correlation Heatmap", fontweight="bold")
        st.pyplot(fig); plt.close()

    with c4:
        # Scatter: temp vs log area
        fig, ax = plt.subplots(figsize=(7, 5))
        scatter = ax.scatter(df["temp"], np.log1p(df["area"]),
                             c=df["wind"], cmap="YlOrRd", alpha=0.6, s=30)
        plt.colorbar(scatter, ax=ax, label="Wind Speed (km/h)")
        ax.set_title("Temperature vs log(Area) — coloured by Wind", fontweight="bold")
        ax.set_xlabel("Temperature (°C)"); ax.set_ylabel("log(1 + Area)")
        ax.grid(alpha=0.3)
        st.pyplot(fig); plt.close()

    # Stats table
    st.markdown("### Dataset Statistics")
    st.dataframe(df.describe().style.format("{:.2f}"), use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — MODEL INFO
# ══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.markdown("### ANN Architecture")

    # Architecture diagram
    fig, ax = plt.subplots(figsize=(12, 3.5))
    ax.axis("off")
    layers_info = [
        ("Input\n12 features", "#3498db"),
        ("Dense(128)\nBatchNorm\nReLU + Dropout", "#9b59b6"),
        ("Dense(64)\nBatchNorm\nReLU + Dropout", "#8e44ad"),
        ("Dense(32)\nReLU", "#e67e22"),
        ("Output\nDense(1)\nLinear", "#2ecc71"),
    ]
    x_positions = [0.07, 0.25, 0.50, 0.73, 0.91]
    for i, ((label, color), xpos) in enumerate(zip(layers_info, x_positions)):
        box = dict(boxstyle="round,pad=0.6", facecolor=color, alpha=0.88, edgecolor="white")
        ax.text(xpos, 0.5, label, ha="center", va="center",
                fontsize=10, color="white", fontweight="bold",
                transform=ax.transAxes, bbox=box)
        if i < len(layers_info) - 1:
            ax.annotate("", xy=(x_positions[i+1]-0.05, 0.5),
                        xytext=(xpos+0.07, 0.5),
                        xycoords="axes fraction", textcoords="axes fraction",
                        arrowprops=dict(arrowstyle="->", color="#555", lw=2))
    ax.set_title("ANN Architecture", fontsize=13, fontweight="bold")
    st.pyplot(fig); plt.close()

    st.divider()

    mc1, mc2 = st.columns(2)

    with mc1:
        st.markdown("### Test Metrics")
        metrics_df = pd.DataFrame({
            "Metric": ["MSE (log)", "RMSE (log)", "MAE (log)", "R² (log)", "RMSE (ha)", "MAE (ha)"],
            "Value": [m["mse_log"], m["rmse_log"], m["mae_log"],
                      m["r2_log"], m["rmse_ha"], m["mae_ha"]]
        })
        st.dataframe(metrics_df, use_container_width=True, hide_index=True)

        st.markdown("### Best Hyperparameters")
        hp_df = pd.DataFrame(meta.get("best_hyperparameters", {}).items(),
                             columns=["Hyperparameter", "Value"])
        st.dataframe(hp_df, use_container_width=True, hide_index=True)

    with mc2:
        st.markdown("### Training Configuration")
        config = {
            "Optimizer":           "Adam",
            "Loss Function":       "MSE",
            "Target Transform":    "log1p(area)",
            "Feature Scaling":     "StandardScaler",
            "Train / Test Split":  "80% / 20%",
            "Val Split":           "15% of train",
            "Regularisation":      "BatchNorm + Dropout",
            "Callbacks":           "EarlyStopping + ReduceLROnPlateau",
            "HParam Search":       "Keras Tuner RandomSearch (15 trials)",
            "Epochs Trained":      meta["training_epochs"],
        }
        for k, v in config.items():
            st.markdown(f"- **{k}**: {v}")

    st.divider()
    st.markdown("### Why log1p Transform?")
    col_raw, col_log = st.columns(2)
    with col_raw:
        fig, ax = plt.subplots(figsize=(5, 3))
        ax.hist(df["area"], bins=50, color="#e74c3c", edgecolor="white", alpha=0.85)
        ax.set_title("Raw area — heavily skewed"); ax.set_xlabel("Area (ha)")
        st.pyplot(fig); plt.close()
    with col_log:
        fig, ax = plt.subplots(figsize=(5, 3))
        ax.hist(np.log1p(df["area"]), bins=40, color="#2ecc71", edgecolor="white", alpha=0.85)
        ax.set_title("log1p(area) — more normal"); ax.set_xlabel("log(1+area)")
        st.pyplot(fig); plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# TAB 4 — DATASET
# ══════════════════════════════════════════════════════════════════════════════
with tab4:
    st.markdown("### Raw Dataset")
    st.markdown(f"**{len(df)} records · {len(df.columns)} columns** — UCI Forest Fires dataset")

    # Filter by month
    month_filter = st.multiselect("Filter by month", MONTH_ORDER, default=MONTH_ORDER)
    filtered_df = df[df["month"].isin(month_filter)]

    st.dataframe(
        filtered_df.style.background_gradient(subset=["area"], cmap="YlOrRd"),
        use_container_width=True, height=400
    )

    st.download_button(
        label="⬇️ Download filtered CSV",
        data=filtered_df.to_csv(index=False),
        file_name="forestfires_filtered.csv",
        mime="text/csv"
    )

    st.markdown("### Column Descriptions")
    col_desc = pd.DataFrame({
        "Column": ["X","Y","month","day","FFMC","DMC","DC","ISI",
                   "temp","RH","wind","rain","area"],
        "Type":   ["int","int","str","str","float","float","float","float",
                   "float","int","float","float","float"],
        "Description": [
            "X-axis spatial coordinate (1–9)",
            "Y-axis spatial coordinate (2–9)",
            "Month of year (jan–dec)",
            "Day of week (mon–sun)",
            "Fine Fuel Moisture Code — surface moisture",
            "Duff Moisture Code — upper organic layer",
            "Drought Code — deep organic layer",
            "Initial Spread Index — rate of spread",
            "Temperature (°C)",
            "Relative Humidity (%)",
            "Wind speed (km/h)",
            "Outside rain (mm/m²)",
            "🎯 TARGET: Burned area (ha)",
        ]
    })
    st.dataframe(col_desc, use_container_width=True, hide_index=True)

# ── Footer ────────────────────────────────────────────────────────────────────
st.divider()
st.markdown(
    "<center style='color:#555; font-size:0.85rem;'>"
    "Forest Fire Burned Area Predictor · ANN Deep Learning Project · "
    "Dataset: <a href='https://archive.ics.uci.edu/ml/datasets/forest+fires' "
    "target='_blank'>UCI ML Repository</a></center>",
    unsafe_allow_html=True
)