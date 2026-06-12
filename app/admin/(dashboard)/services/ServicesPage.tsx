"use client";

import { useState } from "react";
import ServicesEditor, { type Service } from "./ServicesEditor";
import StrukenTvattEditor, { type StrukenProduct } from "./StrukenTvattEditor";

type Tab = "struken" | "ovriga";

const TABS: { id: Tab; label: string; description: string }[] = [
  {
    id:          "struken",
    label:       "Sortiment",
    description: "Produkter & priser per kategori",
  },
  {
    id:          "ovriga",
    label:       "Övriga tjänster",
    description: "Visas ej i bokningsflödet",
  },
];

export default function ServicesPage({
  initialServices,
  initialStrukenProducts,
}: {
  initialServices:        Service[];
  initialStrukenProducts: StrukenProduct[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("struken");

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.2rem" }}>Tjänster</h1>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>
          Hantera priser och sortiment för varje tjänst
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding:         "0.6rem 1.2rem",
              borderRadius:    "8px",
              border:          "1px solid",
              borderColor:     activeTab === tab.id ? "#1a1a1a" : "#e5e5e5",
              background:      activeTab === tab.id ? "#1a1a1a" : "#fff",
              color:           activeTab === tab.id ? "#fff" : "#666",
              cursor:          "pointer",
              fontSize:        "0.875rem",
              fontWeight:      activeTab === tab.id ? 600 : 400,
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "flex-start",
              gap:             "0.1rem",
              transition:      "all 0.12s",
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: "0.72rem", opacity: 0.6, fontWeight: 400 }}>
              {tab.description}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "struken" && (
        <StrukenTvattEditor initialProducts={initialStrukenProducts} />
      )}
      {activeTab === "ovriga" && (
        <ServicesEditor initialServices={initialServices} />
      )}
    </div>
  );
}
