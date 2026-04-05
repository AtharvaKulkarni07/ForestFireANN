"use client";

import { useEffect, useState } from "react";
import { api, Metadata, Encoders } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import PredictTab from "@/components/PredictTab";
import EdaTab from "@/components/EdaTab";
import ModelInfoTab from "@/components/ModelInfoTab";
import DatasetTab from "@/components/DatasetTab";

type TabId = "predict" | "eda" | "model" | "dataset";

const TABS: { id: TabId; label: string }[] = [
  { id: "predict", label: "Predict" },
  { id: "eda", label: "EDA" },
  { id: "model", label: "Model Info" },
  { id: "dataset", label: "Dataset" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("predict");
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [encoders, setEncoders] = useState<Encoders | null>(null);

  useEffect(() => {
    api.getMetadata().then(setMetadata).catch(console.error);
    api.getEncoders().then(setEncoders).catch(console.error);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar metadata={metadata} />

      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <h1 className="page-title">Forest Fire Burned Area Predictor</h1>
          <p className="page-subtitle">
            Deep Learning (ANN) <span>·</span> Montesinho Natural Park, Portugal
          </p>
        </header>

        {/* Tabs */}
        <nav className="tabs" role="tablist" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              id={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <section role="tabpanel">
          {activeTab === "predict" && <PredictTab encoders={encoders} />}
          {activeTab === "eda" && <EdaTab />}
          {activeTab === "model" && <ModelInfoTab metadata={metadata} />}
          {activeTab === "dataset" && <DatasetTab encoders={encoders} />}
        </section>

        {/* Footer */}
        <footer className="footer">
          Forest Fire Burned Area Predictor · ANN Deep Learning Project ·
          Dataset:{" "}
          <a
            href="https://archive.ics.uci.edu/ml/datasets/forest+fires"
            target="_blank"
            rel="noopener noreferrer"
          >
            UCI ML Repository
          </a>
        </footer>
      </main>
    </div>
  );
}
