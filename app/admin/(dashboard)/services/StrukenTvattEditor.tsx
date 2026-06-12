"use client";

import { useState } from "react";

export type StrukenProduct = {
  id:       string;
  name:     string;
  price:    number;
  category: string;
  order:    number;
};

// Mirrors the customer order page (app/order/page.tsx). Mattvätt is omitted here
// because it uses fixed local sizes, not the StrukenTvatt catalogue.
const CATEGORIES = ["Hushållstvätt", "Hushållstvätt RUT", "Hem", "Tvätt"] as const;
type Category = (typeof CATEGORIES)[number];

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  items,
  onAdd,
  onDelete,
  onUpdatePrice,
}: {
  category:       Category;
  items:          StrukenProduct[];
  onAdd:          (category: string, name: string, price: number) => Promise<void>;
  onDelete:       (id: string) => Promise<void>;
  onUpdatePrice:  (id: string, price: number) => Promise<void>;
}) {
  const [newName,  setNewName]  = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding,   setAdding]   = useState(false);
  const [addError, setAddError] = useState("");

  // Inline price editing
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState("");

  async function handleAdd() {
    if (!newName.trim()) { setAddError("Ange ett namn."); return; }
    const price = parseFloat(newPrice);
    if (!newPrice || isNaN(price) || price <= 0) { setAddError("Ange ett giltigt pris."); return; }
    setAdding(true);
    setAddError("");
    try {
      await onAdd(category, newName.trim(), price);
      setNewName("");
      setNewPrice("");
    } catch {
      setAddError("Kunde inte lägga till. Försök igen.");
    } finally {
      setAdding(false);
    }
  }

  async function handlePriceSave(id: string) {
    const price = parseFloat(editPriceVal);
    if (isNaN(price) || price <= 0) { setEditingPrice(null); return; }
    await onUpdatePrice(id, price);
    setEditingPrice(null);
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>{category}</p>
        <span style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 500 }}>
          {items.length} {items.length === 1 ? "plagg" : "plagg"}
        </span>
      </div>

      {/* Item list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.length === 0 && (
          <p style={{ fontSize: "0.8rem", color: "#ccc", paddingBottom: "0.5rem" }}>
            Inga plagg ännu. Lägg till nedan.
          </p>
        )}
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              paddingTop: i === 0 ? 0 : "0.45rem",
              paddingBottom: "0.45rem",
              borderBottom: i < items.length - 1 ? "1px solid #f5f5f5" : "none",
            }}
          >
            {/* Name */}
            <span style={{ flex: 1, fontSize: "0.875rem", color: "#333" }}>{item.name}</span>

            {/* Price — click to edit inline */}
            {editingPrice === item.id ? (
              <input
                type="number"
                value={editPriceVal}
                autoFocus
                onChange={e => setEditPriceVal(e.target.value)}
                onBlur={() => handlePriceSave(item.id)}
                onKeyDown={e => { if (e.key === "Enter") handlePriceSave(item.id); if (e.key === "Escape") setEditingPrice(null); }}
                style={{ width: "70px", padding: "0.2rem 0.4rem", border: "1px solid #aaa", borderRadius: "4px", fontSize: "0.8rem", textAlign: "right" }}
              />
            ) : (
              <button
                title="Klicka för att ändra pris"
                onClick={() => { setEditingPrice(item.id); setEditPriceVal(String(item.price)); }}
                style={{ background: "#f5f5f5", border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.8rem", color: "#555", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {item.price} kr
              </button>
            )}

            {/* Remove */}
            <button
              onClick={() => { if (confirm(`Ta bort "${item.name}"?`)) onDelete(item.id); }}
              title="Ta bort"
              style={{ background: "none", border: "none", color: "#ddd", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0 0.15rem", fontWeight: 700, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
              onMouseLeave={e => (e.currentTarget.style.color = "#ddd")}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px dashed #eee", marginTop: "0.75rem", paddingTop: "0.75rem" }}>
        {/* Add row */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input
            placeholder="Namn på plagg…"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={{ flex: 1, padding: "0.4rem 0.6rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.8rem", color: "#333", outline: "none" }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type="number"
              placeholder="Pris"
              value={newPrice}
              onChange={e => { setNewPrice(e.target.value); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              style={{ width: "70px", padding: "0.4rem 1.8rem 0.4rem 0.6rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
            />
            <span style={{ position: "absolute", right: "0.5rem", fontSize: "0.75rem", color: "#aaa", pointerEvents: "none" }}>kr</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{ padding: "0.4rem 0.75rem", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", opacity: adding ? 0.6 : 1, whiteSpace: "nowrap" }}
          >
            {adding ? "…" : "+ Lägg till"}
          </button>
        </div>
        {addError && <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.3rem" }}>{addError}</p>}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function StrukenTvattEditor({ initialProducts }: { initialProducts: StrukenProduct[] }) {
  const [products, setProducts] = useState<StrukenProduct[]>(initialProducts);

  // Group by category
  const byCategory = (cat: Category) =>
    products.filter(p => p.category === cat).sort((a, b) => a.order - b.order);

  async function handleAdd(category: string, name: string, price: number) {
    const res = await fetch("/api/admin/struken-tvatt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, category }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed");

    const maxOrder = products.filter(p => p.category === category).reduce((m, p) => Math.max(m, p.order), 0);
    setProducts(prev => [...prev, { id: json.id, name, price, category, order: maxOrder + 1 }]);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/struken-tvatt/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("Kunde inte ta bort. Försök igen."); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function handleUpdatePrice(id: string, price: number) {
    const res = await fetch(`/api/admin/struken-tvatt/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price }),
    });
    if (!res.ok) { alert("Kunde inte spara pris. Försök igen."); return; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, price } : p));
  }

  return (
    <div>
      <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1.5rem" }}>
        Klicka på ett pris för att ändra det. Tryck på ✕ för att ta bort ett plagg.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {CATEGORIES.map(cat => (
          <CategoryCard
            key={cat}
            category={cat}
            items={byCategory(cat)}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onUpdatePrice={handleUpdatePrice}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:   "#fff",
  border:       "1px solid #eee",
  borderRadius: "10px",
  padding:      "1.1rem 1.25rem",
};
