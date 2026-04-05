"use client";

import { Metadata } from "@/lib/api";

interface SidebarProps {
  metadata: Metadata | null;
}

export default function Sidebar({ metadata }: SidebarProps) {
  const m = metadata?.metrics;
  const hp = metadata?.best_hyperparameters;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon"></span>
        <h2>Forest Fire Predictor</h2>
      </div>
      <p className="sidebar-desc">
        Predict burned area using an <strong>ANN</strong> trained on the UCI
        Forest Fires dataset.
      </p>

      <div className="sidebar-divider" />

      <h4 className="sidebar-section-title">Model Performance</h4>
      {m ? (
        <>
          <div className="sidebar-metric">
            <span className="label">R² (log-space)</span>
            <span className="value">{m.r2_log.toFixed(4)}</span>
          </div>
          <div className="sidebar-metric">
            <span className="label">MAE (ha)</span>
            <span className="value">{m.mae_ha.toFixed(2)} ha</span>
          </div>
          <div className="sidebar-metric">
            <span className="label">RMSE (ha)</span>
            <span className="value">{m.rmse_ha.toFixed(2)} ha</span>
          </div>
        </>
      ) : (
        <div className="skeleton" style={{ height: 80 }} />
      )}

      <div className="sidebar-divider" />

      <h4 className="sidebar-section-title">Training Info</h4>
      {metadata ? (
        <ul className="sidebar-info">
          <li>
            Epochs trained: <strong>{metadata.training_epochs}</strong>
          </li>
          <li>
            Target transform: <strong>log1p(area)</strong>
          </li>
          {hp && (
            <>
              <li>
                Best LR:{" "}
                <strong>{hp.learning_rate ?? "–"}</strong>
              </li>
              <li>
                Layers: <strong>{hp.n_layers ?? "–"}</strong>
              </li>
            </>
          )}
        </ul>
      ) : (
        <div className="skeleton" style={{ height: 60 }} />
      )}

      <div className="sidebar-divider" />

      <div className="sidebar-footer">
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Dataset:{" "}
          <a
            href="https://archive.ics.uci.edu/ml/datasets/forest+fires"
            target="_blank"
            rel="noopener noreferrer"
          >
            UCI Forest Fires
          </a>
        </p>
      </div>
    </aside>
  );
}
