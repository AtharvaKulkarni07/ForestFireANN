"use client";

import { useState } from "react";
import { api, PredictionInput, PredictionResult, Encoders } from "@/lib/api";

interface PredictTabProps {
  encoders: Encoders | null;
}

export default function PredictTab({ encoders }: PredictTabProps) {
  const months = encoders?.months ?? [];
  const days = encoders?.days ?? [];

  const [form, setForm] = useState<PredictionInput>({
    X: 5,
    Y: 4,
    month: "aug",
    day: "fri",
    FFMC: 90.6,
    DMC: 110.9,
    DC: 547.9,
    ISI: 9.0,
    temp: 22.0,
    RH: 40,
    wind: 4.0,
    rain: 0.0,
  });

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInputs, setShowInputs] = useState(false);

  const update = (key: keyof PredictionInput, value: number | string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.predict(form);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const riskClass =
    result?.risk_level === "Low"
      ? "low"
      : result?.risk_level === "Moderate"
      ? "moderate"
      : "high";

  return (
    <div className="fade-in">
      <h3 className="section-title">Enter Fire Conditions</h3>
      <p className="section-desc">
        Adjust the inputs below and click <strong>Predict</strong> to estimate
        the burned area.
      </p>

      <div className="grid-3">
        {/* Column 1: Location & Time */}
        <div className="card">
          <div className="form-group-title">Location &amp; Time</div>

          <SliderInput
            label="X – East coord (1–9)"
            value={form.X}
            min={1}
            max={9}
            step={1}
            onChange={(v) => update("X", v)}
          />
          <SliderInput
            label="Y – North coord (2–9)"
            value={form.Y}
            min={2}
            max={9}
            step={1}
            onChange={(v) => update("Y", v)}
          />

          <div className="form-group">
            <label className="form-label">Month</label>
            <select
              className="select-input"
              value={form.month}
              onChange={(e) => update("month", e.target.value)}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Day of week</label>
            <select
              className="select-input"
              value={form.day}
              onChange={(e) => update("day", e.target.value)}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Column 2: Weather */}
        <div className="card">
          <div className="form-group-title">Weather Conditions</div>
          <SliderInput
            label="Temperature (°C)"
            value={form.temp}
            min={2.2}
            max={33.3}
            step={0.1}
            onChange={(v) => update("temp", v)}
          />
          <SliderInput
            label="Relative Humidity (%)"
            value={form.RH}
            min={15}
            max={100}
            step={1}
            onChange={(v) => update("RH", v)}
          />
          <SliderInput
            label="Wind Speed (km/h)"
            value={form.wind}
            min={0.4}
            max={9.4}
            step={0.1}
            onChange={(v) => update("wind", v)}
          />
          <SliderInput
            label="Rain (mm/m²)"
            value={form.rain}
            min={0.0}
            max={6.4}
            step={0.1}
            onChange={(v) => update("rain", v)}
          />
        </div>

        {/* Column 3: FWI */}
        <div className="card">
          <div className="form-group-title">Fire Weather Indices (FWI)</div>
          <SliderInput
            label="FFMC"
            value={form.FFMC}
            min={18.7}
            max={96.2}
            step={0.1}
            onChange={(v) => update("FFMC", v)}
            tooltip="Fine Fuel Moisture Code — moisture in litter"
          />
          <SliderInput
            label="DMC"
            value={form.DMC}
            min={1.1}
            max={291.3}
            step={0.1}
            onChange={(v) => update("DMC", v)}
            tooltip="Duff Moisture Code"
          />
          <SliderInput
            label="DC"
            value={form.DC}
            min={7.9}
            max={860.6}
            step={1.0}
            onChange={(v) => update("DC", v)}
            tooltip="Drought Code — deep organic layer moisture"
          />
          <SliderInput
            label="ISI"
            value={form.ISI}
            min={0.0}
            max={56.1}
            step={0.1}
            onChange={(v) => update("ISI", v)}
            tooltip="Initial Spread Index — rate of fire spread"
          />
        </div>
      </div>

      <div className="divider" />

      <button
        className="predict-button"
        onClick={handlePredict}
        disabled={loading}
        id="predict-btn"
      >
        {loading && <span className="loading-spinner" />}
        {loading ? "Predicting…" : "Predict Burned Area"}
      </button>

      {error && (
        <div
          className="info-banner"
          style={{
            borderColor: "rgba(231,76,60,0.3)",
            background: "rgba(231,76,60,0.08)",
            marginTop: "1rem",
          }}
        >
          <span className="icon"></span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div style={{ marginTop: "1.5rem" }} className="fade-in">
          <div className="result-grid">
            <div className="result-card">
              <div className="card-title">Predicted Burned Area</div>
              <div className={`card-value ${riskClass}`}>
                {result.predicted_area_ha.toFixed(2)} ha
              </div>
            </div>
            <div className="result-card">
              <div className="card-title">Risk Level</div>
              <div className={`card-value ${riskClass}`}>
                {result.risk_emoji} {result.risk_level}
              </div>
            </div>
            <div className="result-card">
              <div className="card-title">Log₁₊ Prediction</div>
              <div
                className="card-value"
                style={{ color: "var(--text-muted)" }}
              >
                {result.log_prediction.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="interpretation-box">
            <strong>Interpretation:</strong> {result.interpretation}
          </div>

          <div className="expandable">
            <button
              className="expandable-toggle"
              onClick={() => setShowInputs(!showInputs)}
            >
              Input Summary {showInputs ? "▲" : "▼"}
            </button>
            {showInputs && (
              <div className="expandable-content">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.input_features).map(
                        ([feat, val]) => (
                          <tr key={feat}>
                            <td>{feat}</td>
                            <td>{val}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="info-banner" style={{ marginTop: "1rem" }}>
            <span className="icon"></span>
            <span>
              This model is trained on 517 records. Predictions are indicative —
              the Forest Fires dataset is known to be challenging for regression
              models.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Slider sub-component ─────────────────────────────────── */
function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  tooltip?: string;
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        <span>
          {label}
          {tooltip && (
            <span className="tooltip-icon" title={tooltip}>
              ?
            </span>
          )}
        </span>
        <span className="value-display">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
