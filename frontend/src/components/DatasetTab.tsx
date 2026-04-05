"use client";

import { useEffect, useState, useCallback } from "react";
import {
  api,
  DatasetResponse,
  ColumnDescription,
  Encoders,
} from "@/lib/api";

interface DatasetTabProps {
  encoders: Encoders | null;
}

export default function DatasetTab({ encoders }: DatasetTabProps) {
  const months = encoders?.months ?? [];
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [colDescs, setColDescs] = useState<ColumnDescription[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize with all months selected
  useEffect(() => {
    if (months.length > 0 && selectedMonths.length === 0) {
      setSelectedMonths([...months]);
    }
  }, [months, selectedMonths.length]);

  const fetchDataset = useCallback(async (m: string[]) => {
    setLoading(true);
    try {
      const data = await api.getDataset(m.length > 0 ? m : undefined);
      setDataset(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMonths.length > 0) {
      fetchDataset(selectedMonths);
    }
  }, [selectedMonths, fetchDataset]);

  useEffect(() => {
    api
      .getColumnDescriptions()
      .then((res) => setColDescs(res.columns))
      .catch(console.error);
  }, []);

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month]
    );
  };

  const handleDownload = () => {
    if (!dataset) return;
    const cols = dataset.columns;
    const csvRows = [
      cols.join(","),
      ...dataset.data.map((row) => cols.map((c) => row[c] ?? "").join(",")),
    ];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forestfires_filtered.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // For area heat-bar
  const maxArea = dataset
    ? Math.max(...dataset.data.map((r) => Number(r.area) || 0), 1)
    : 1;

  return (
    <div className="fade-in">
      <h3 className="section-title">Raw Dataset</h3>
      <p className="section-desc">
        {dataset ? (
          <>
            <strong>{dataset.total_records} records</strong> ·{" "}
            <strong>{dataset.total_columns} columns</strong> — UCI Forest Fires
            dataset
          </>
        ) : (
          "Loading dataset…"
        )}
      </p>

      {/* Month filter */}
      <div style={{ marginBottom: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginRight: "0.5rem",
          }}
        >
          Filter by month:
        </span>
      </div>
      <div className="filter-bar">
        {months.map((m) => (
          <button
            key={m}
            className={`filter-chip ${
              selectedMonths.includes(m) ? "active" : ""
            }`}
            onClick={() => toggleMonth(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Data table */}
      {loading ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : dataset && dataset.data.length > 0 ? (
        <div className="data-table-wrapper">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {dataset.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.data.map((row, ri) => (
                  <tr key={ri}>
                    {dataset.columns.map((col) => {
                      const val = row[col];
                      if (col === "area") {
                        const numVal = Number(val) || 0;
                        const pct = (numVal / maxArea) * 100;
                        return (
                          <td key={col} className="area-cell">
                            <div
                              className="area-bar"
                              style={{ width: `${pct}%` }}
                            />
                            <span>{val}</span>
                          </td>
                        );
                      }
                      return <td key={col}>{val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="info-banner">
          <span className="icon"></span>
          <span>No records match the selected filters.</span>
        </div>
      )}

      {/* Download */}
      <div style={{ marginTop: "1rem" }}>
        <button
          className="download-button"
          onClick={handleDownload}
          disabled={!dataset}
        >
          Download filtered CSV
        </button>
      </div>

      <div className="divider" />

      {/* Column Descriptions */}
      <h3 className="section-title">Column Descriptions</h3>
      {colDescs.length > 0 ? (
        <div className="data-table-wrapper">
          <table className="data-table col-desc-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {colDescs.map((col) => (
                <tr key={col.name}>
                  <td>{col.name}</td>
                  <td>{col.type}</td>
                  <td>{col.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="skeleton" style={{ height: 300 }} />
      )}
    </div>
  );
}
