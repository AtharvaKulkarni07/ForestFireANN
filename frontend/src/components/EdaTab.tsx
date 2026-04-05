"use client";

import { useEffect, useState, useMemo } from "react";
import {
  api,
  AreaDistribution,
  FiresByMonth,
  CorrelationData,
  ScatterData,
  StatisticsData,
} from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";

// Coolwarm color interpolation for correlation heatmap
function correlationColor(val: number): string {
  // val ranges from -1 to 1
  const t = (val + 1) / 2; // normalize to 0-1
  if (t < 0.5) {
    // blue to white
    const s = t * 2;
    const r = Math.round(59 + s * (240 - 59));
    const g = Math.round(76 + s * (240 - 76));
    const b = Math.round(192 + s * (240 - 192));
    return `rgb(${r},${g},${b})`;
  } else {
    // white to red
    const s = (t - 0.5) * 2;
    const r = Math.round(240 + s * (231 - 240));
    const g = Math.round(240 - s * (240 - 76));
    const b = Math.round(240 - s * (240 - 60));
    return `rgb(${r},${g},${b})`;
  }
}

function windToColor(wind: number, maxWind: number): string {
  const t = Math.min(wind / maxWind, 1);
  // Yellow → Orange → Red
  const r = 255;
  const g = Math.round(255 - t * 200);
  const b = Math.round(50 - t * 50);
  return `rgba(${r},${g},${Math.max(b, 0)},0.65)`;
}

export default function EdaTab() {
  const [areaDist, setAreaDist] = useState<AreaDistribution | null>(null);
  const [firesByMonth, setFiresByMonth] = useState<FiresByMonth | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null);
  const [scatter, setScatter] = useState<ScatterData | null>(null);
  const [stats, setStats] = useState<StatisticsData | null>(null);

  useEffect(() => {
    api.getAreaDistribution().then(setAreaDist).catch(console.error);
    api.getFiresByMonth().then(setFiresByMonth).catch(console.error);
    api.getCorrelation().then(setCorrelation).catch(console.error);
    api.getTempVsArea().then(setScatter).catch(console.error);
    api.getStatistics().then(setStats).catch(console.error);
  }, []);

  // Build histogram bins from raw values
  const histogramData = useMemo(() => {
    if (!areaDist) return [];
    const values = areaDist.values;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const nBins = 30;
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
  }, [areaDist]);

  // Monthly fire chart data
  const monthlyData = useMemo(() => {
    if (!firesByMonth) return [];
    return firesByMonth.labels.map((label, i) => ({
      month: label,
      count: firesByMonth.counts[i],
    }));
  }, [firesByMonth]);

  // Scatter data
  const scatterData = useMemo(() => {
    if (!scatter) return [];
    const maxWind = Math.max(...scatter.wind);
    return scatter.temp.map((t, i) => ({
      temp: t,
      logArea: parseFloat(scatter.log_area[i].toFixed(3)),
      wind: scatter.wind[i],
      color: windToColor(scatter.wind[i], maxWind),
    }));
  }, [scatter]);

  const maxWind = useMemo(() => {
    if (!scatter) return 1;
    return Math.max(...scatter.wind);
  }, [scatter]);

  return (
    <div className="fade-in">
      <h3 className="section-title">Exploratory Data Analysis</h3>
      <p className="section-desc">
        Visual insights from the UCI Forest Fires dataset (517 records).
      </p>

      <div className="grid-2">
        {/* Area Distribution */}
        <div className="chart-card">
          <h3>Burned Area Distribution (log1p)</h3>
          {histogramData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={histogramData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="bin"
                  tick={{ fill: "#9a9ab5", fontSize: 10 }}
                  interval={4}
                />
                <YAxis tick={{ fill: "#9a9ab5", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#f0f0f5",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#3498db" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 280 }} />
          )}
        </div>

        {/* Fires by Month */}
        <div className="chart-card">
          <h3>Fire Count by Month</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9a9ab5", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#9a9ab5", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#f0f0f5",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#e74c3c" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 280 }} />
          )}
        </div>

        {/* Correlation Heatmap */}
        <div className="chart-card">
          <h3>Feature Correlation Heatmap</h3>
          {correlation ? (
            <div style={{ overflowX: "auto" }}>
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th></th>
                    {correlation.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlation.columns.map((row, ri) => (
                    <tr key={row}>
                      <td className="row-header">{row}</td>
                      {correlation.matrix[ri].map((val, ci) => (
                        <td
                          key={ci}
                          style={{
                            background: correlationColor(val),
                            color:
                              Math.abs(val) > 0.5
                                ? "white"
                                : "#222",
                            fontWeight: Math.abs(val) > 0.5 ? 700 : 400,
                          }}
                        >
                          {val.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="skeleton" style={{ height: 300 }} />
          )}
        </div>

        {/* Scatter: Temp vs log(Area) */}
        <div className="chart-card">
          <h3>Temperature vs log(Area) — coloured by Wind</h3>
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="temp"
                  name="Temperature (°C)"
                  tick={{ fill: "#9a9ab5", fontSize: 11 }}
                  label={{
                    value: "Temperature (°C)",
                    position: "bottom",
                    offset: 0,
                    style: { fill: "#9a9ab5", fontSize: 11 },
                  }}
                />
                <YAxis
                  dataKey="logArea"
                  name="log(1 + Area)"
                  tick={{ fill: "#9a9ab5", fontSize: 11 }}
                  label={{
                    value: "log(1 + Area)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#9a9ab5", fontSize: 11 },
                  }}
                />
                <ZAxis dataKey="wind" range={[20, 100]} name="Wind (km/h)" />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#f0f0f5",
                    fontSize: 12,
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    Number(value).toFixed(2),
                    String(name),
                  ]}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={windToColor(entry.wind, maxWind)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton" style={{ height: 300 }} />
          )}
        </div>
      </div>

      {/* Statistics Table */}
      <div style={{ marginTop: "2rem" }}>
        <h3 className="section-title">Dataset Statistics</h3>
        {stats ? (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Statistic</th>
                  {stats.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.index.map((stat, ri) => (
                  <tr key={stat}>
                    <td style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                      {stat}
                    </td>
                    {stats.data[ri].map((v, ci) => (
                      <td key={ci}>{v.toFixed(2)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="skeleton" style={{ height: 200 }} />
        )}
      </div>
    </div>
  );
}
