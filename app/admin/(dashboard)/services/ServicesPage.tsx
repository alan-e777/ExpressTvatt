"use client";

import StrukenTvattEditor, { type StrukenProduct } from "./StrukenTvattEditor";
import type { ProductWarning } from "./WarningsManager";

export default function ServicesPage({
  initialStrukenProducts,
  initialWarnings,
}: {
  initialStrukenProducts: StrukenProduct[];
  initialWarnings: ProductWarning[];
}) {
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.2rem" }}>Tjänster</h1>
        <p style={{ color: "#999", fontSize: "0.875rem" }}>
          Hantera priser och sortiment för varje tjänst
        </p>
      </div>

      <StrukenTvattEditor
        initialProducts={initialStrukenProducts}
        initialWarnings={initialWarnings}
      />
    </div>
  );
}
