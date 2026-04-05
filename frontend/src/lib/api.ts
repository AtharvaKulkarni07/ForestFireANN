const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PredictionInput {
  X: number;
  Y: number;
  month: string;
  day: string;
  FFMC: number;
  DMC: number;
  DC: number;
  ISI: number;
  temp: number;
  RH: number;
  wind: number;
  rain: number;
}

export interface PredictionResult {
  predicted_area_ha: number;
  log_prediction: number;
  risk_level: string;
  risk_emoji: string;
  interpretation: string;
  input_features: Record<string, number>;
}

export interface Metadata {
  features: string[];
  metrics: {
    mse_log: number;
    rmse_log: number;
    mae_log: number;
    r2_log: number;
    rmse_ha: number;
    mae_ha: number;
  };
  best_hyperparameters: Record<string, number | string>;
  training_epochs: number;
  preprocessing: Record<string, string | boolean | number>;
  n_train: number;
  n_test: number;
}

export interface Encoders {
  months: string[];
  days: string[];
}

export interface CorrelationData {
  columns: string[];
  matrix: number[][];
}

export interface ScatterData {
  temp: number[];
  log_area: number[];
  wind: number[];
}

export interface FiresByMonth {
  months: string[];
  labels: string[];
  counts: number[];
}

export interface StatisticsData {
  columns: string[];
  index: string[];
  data: number[][];
}

export interface AreaDistribution {
  values: number[];
}

export interface AreaRawVsLog {
  raw_area: number[];
  log_area: number[];
}

export interface DatasetResponse {
  total_records: number;
  total_columns: number;
  columns: string[];
  data: Record<string, string | number>[];
}

export interface ColumnDescription {
  name: string;
  type: string;
  description: string;
}

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getMetadata: () => fetchJSON<Metadata>("/api/metadata"),
  getEncoders: () => fetchJSON<Encoders>("/api/encoders"),

  predict: (input: PredictionInput) =>
    fetchJSON<PredictionResult>("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),

  getAreaDistribution: () => fetchJSON<AreaDistribution>("/api/eda/area-distribution"),
  getFiresByMonth: () => fetchJSON<FiresByMonth>("/api/eda/fires-by-month"),
  getCorrelation: () => fetchJSON<CorrelationData>("/api/eda/correlation"),
  getTempVsArea: () => fetchJSON<ScatterData>("/api/eda/temp-vs-area"),
  getStatistics: () => fetchJSON<StatisticsData>("/api/eda/statistics"),
  getAreaRawVsLog: () => fetchJSON<AreaRawVsLog>("/api/eda/area-raw-vs-log"),

  getDataset: (months?: string[]) => {
    const query = months ? `?months=${months.join(",")}` : "";
    return fetchJSON<DatasetResponse>(`/api/dataset${query}`);
  },
  getColumnDescriptions: () =>
    fetchJSON<{ columns: ColumnDescription[] }>("/api/dataset/column-descriptions"),
};
