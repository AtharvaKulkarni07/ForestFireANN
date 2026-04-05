"use client";

import { useEffect, useState, useMemo } from "react";
import { api, Metadata, AreaRawVsLog } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ModelInfoTabProps {
  metadata: Metadata | null;
}

const LAYERS = [
  { label: "Input\n12 features", color: "#3498db" },
  { label: "Dense(128)\nBatchNorm\nReLU + Dropout", color: "#9b59b6" },
  { label: "Dense(64)\nBatchNorm\nReLU + Dropout", color: "#8e44ad" },
  { label: "Dense(32)\nReLU", color: "#e67e22" },
  { label: "Output\nDense(1)\nLinear", color: "#2ecc71" },
];

export default function ModelInfoTab({ metadata }: ModelInfoTabProps) {
  const m = metadata?.metrics;
  const hp = metadata?.best_hyperparameters;
  const [areaData, setAreaData] = useState<AreaRawVsLog | null>(null);

  useEffect(() => {
    api.getAreaRawVsLog().then(setAreaData).catch(console.error);
  }, []);

  const rawHistogram = useMemo(() => {
    if (!areaData) return [];
    const values = areaData.raw_area;
    const max = Math.max(...values);
    const nBins = 40;
    const binSize = max / nBins;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      bin: (i * binSize).toFixed(0),
      count: 0,
    }));
    values.forEach((v) => {
      const idx = Math.min(Math.floor(v / binSize), nBins - 1);
      bins[idx].count++;
    });
    return bins;
  }, [areaData]);

  const logHistogram = useMemo(() => {
    if (!areaData) return [];
    const values = areaData.log_area;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const nBins = 35;
    const binSize = (max - min) / nBins;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      bin: (min + i * binSize).toFixed(1),
      count: 0,
    }));
    values.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / binSize), nBins - 1);
      bins[idx].count++;
    });
    return bins;
  }, [areaData]);

  const metricsRows = m
    ? [
        { metric: "MSE (log)", value: m.mse_log },
        { metric: "RMSE (log)", value: m.rmse_log },
        { metric: "MAE (log)", value: m.mae_log },
        { metric: "R² (log)", value: m.r2_log },
        { metric: "RMSE (ha)", value: m.rmse_ha },
        { metric: "MAE (ha)", value: m.mae_ha },
      ]
    : [];

  const hpRows = hp
    ? Object.entries(hp).map(([k, v]) => ({
        param: k,
        value: typeof v === "number" ? v.toString() : String(v),
      }))
    : [];

  const config: Record<string, string | number> = {
    Optimizer: "Adam",
    "Loss Function": "MSE",
    "Target Transform": "log1p(area)",
    "Feature Scaling": "StandardScaler",
    "Train / Test Split": "80% / 20%",
    "Val Split": "15% of train",
    Regularisation: "BatchNorm + Dropout",
    Callbacks: "EarlyStopping + ReduceLROnPlateau",
    "HParam Search": "Keras Tuner RandomSearch (15 trials)",
    "Epochs Trained": metadata?.training_epochs ?? "–",
  };

  return (
    <div className="fade-in">
      <h3 className="section-title">ANN Architecture</h3>

      {/* Architecture Diagram */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="arch-diagram">
          {LAYERS.map((layer, i) => (
            <span key={i} style={{ display: "contents" }}>
              <div
                className="arch-layer"
                style={{ backgroundColor: layer.color }}
              >
                {layer.label.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < layer.label.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
              {i < LAYERS.length - 1 && <span className="arch-arrow">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="grid-2">
        {/* Left: Metrics & Hyperparams */}
        <div>
          <h3 className="section-title" style={{ marginTop: "0.5rem" }}>
            Test Metrics
          </h3>
          {metricsRows.length > 0 ? (
            <div className="data-table-wrapper" style={{ marginBottom: "1.5rem" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsRows.map((row) => (
                    <tr key={row.metric}>
                      <td>{row.metric}</td>
                      <td>{row.value.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="skeleton" style={{ height: 200, marginBottom: "1.5rem" }} />
          )}

          <h3 className="section-title">Best Hyperparameters</h3>
          {hpRows.length > 0 ? (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hyperparameter</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {hpRows.map((row) => (
                    <tr key={row.param}>
                      <td>{row.param}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="skeleton" style={{ height: 200 }} />
          )}
        </div>

        {/* Right: Training Configuration */}
        <div>
          <h3 className="section-title" style={{ marginTop: "0.5rem" }}>
            Training Configuration
          </h3>
          <div className="card">
            <ul className="config-list">
              {Object.entries(config).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}:</strong> {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Why log1p transform */}
      <h3 className="section-title">Why log1p Transform?</h3>
      <p className="section-desc">
        The raw area distribution is heavily right-skewed. Applying log1p
        produces a more normal distribution, improving model training.
      </p>

      <div className="grid-2">
        <div className="chart-card">
          <h3>Raw area — heavily skewed</h3>
          {rawHistogram.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rawHistogram}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="bin"
                  tick={{ fill: "#9a9ab5", fontSize: 10 }}
                  interval={7}
                  label={{
                    value: "Area (ha)",
                    position: "bottom",
                    offset: -2,
                    style: { fill: "#9a9ab5", fontSize: 11 },
                  }}
                />
                <YAxis tick={{ fill: "#9a9ab5", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#f0f0f5",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#e74c3c" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 220 }} />
          )}
        </div>

        <div className="chart-card">
          <h3>log1p(area) — more normal</h3>
          {logHistogram.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={logHistogram}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="bin"
                  tick={{ fill: "#9a9ab5", fontSize: 10 }}
                  interval={5}
                  label={{
                    value: "log(1+area)",
                    position: "bottom",
                    offset: -2,
                    style: { fill: "#9a9ab5", fontSize: 11 },
                  }}
                />
                <YAxis tick={{ fill: "#9a9ab5", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#f0f0f5",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#2ecc71" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 220 }} />
          )}
        </div>
      </div>
    </div>
  );
}
