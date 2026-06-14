"use client";

import { useState } from "react";
import { PRODUCT_ICONS, getProductIcon } from "@/lib/productIcons";

export type StrukenProduct = {
  id:              string;
  name:            string;
  price:           number;
  category:        string;
  order:           number;
  discountPercent: number;
  icon:            string;
};

const DEFAULT_ICON = PRODUCT_ICONS[0].key;

// Small grid popover for choosing one of the registered product icons.
function IconPicker({ value, onSelect, onClose }: { value: string; onSelect: (key: string) => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div style={{
        position: "absolute", zIndex: 41, top: "calc(100% + 4px)", left: 0,
        background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "0.5rem",
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.25rem", width: "230px",
      }}>
        {PRODUCT_ICONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            title={label}
            onClick={() => { onSelect(key); onClose(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, height: 40, borderRadius: "8px", cursor: "pointer",
              background: key === value ? "#1a1a1a" : "#f5f5f5",
              color: key === value ? "#fff" : "#555", border: "none",
            }}
          >
            <Icon size={20} stroke={1.5} />
          </button>
        ))}
      </div>
    </>
  );
}

// A button showing the current icon; opens the picker on click.
function IconSelectButton({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = getProductIcon(value);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        title="Välj ikon"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 34, borderRadius: "8px", cursor: "pointer",
          background: "#f5f5f5", border: "1px solid #e5e5e5", color: "#555",
        }}
      >
        <Icon size={18} stroke={1.5} />
      </button>
      {open && <IconPicker value={value} onSelect={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

// Parse a percentage input into a clamped 0–100 integer.
function clampPctInput(v: string): number {
  const n = Math.round(parseFloat(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

// Mirrors the customer order page (app/order/page.tsx). Mattvätt is omitted here
// because it uses fixed local sizes, not the StrukenTvatt catalogue.
type Category = string;

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  items,
  onAdd,
  onDelete,
  onUpdatePrice,
  onUpdateDiscount,
  onUpdateIcon,
}: {
  category:         Category;
  items:            StrukenProduct[];
  onAdd:            (category: string, name: string, price: number, discountPercent: number, icon: string) => Promise<void>;
  onDelete:         (id: string) => Promise<void>;
  onUpdatePrice:    (id: string, price: number) => Promise<void>;
  onUpdateDiscount: (id: string, discountPercent: number) => Promise<void>;
  onUpdateIcon:     (id: string, icon: string) => Promise<void>;
}) {
  const [newName,     setNewName]     = useState("");
  const [newPrice,    setNewPrice]    = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [newIcon,     setNewIcon]     = useState(DEFAULT_ICON);
  const [adding,      setAdding]      = useState(false);
  const [addError,    setAddError]    = useState("");

  // Inline price editing
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState("");

  // Inline discount editing
  const [editingDisc, setEditingDisc] = useState<string | null>(null);
  const [editDiscVal, setEditDiscVal] = useState("");

  async function handleAdd() {
    if (!newName.trim()) { setAddError("Ange ett namn."); return; }
    const price = parseFloat(newPrice);
    if (!newPrice || isNaN(price) || price <= 0) { setAddError("Ange ett giltigt pris."); return; }
    setAdding(true);
    setAddError("");
    try {
      await onAdd(category, newName.trim(), price, clampPctInput(newDiscount), newIcon);
      setNewName("");
      setNewPrice("");
      setNewDiscount("");
      setNewIcon(DEFAULT_ICON);
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

  async function handleDiscSave(id: string) {
    await onUpdateDiscount(id, clampPctInput(editDiscVal));
    setEditingDisc(null);
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
            {/* Icon picker */}
            <IconSelectButton value={item.icon || ""} onChange={key => onUpdateIcon(item.id, key)} />

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

            {/* Discount % — click to edit inline */}
            {editingDisc === item.id ? (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="number"
                  value={editDiscVal}
                  autoFocus
                  onChange={e => setEditDiscVal(e.target.value)}
                  onBlur={() => handleDiscSave(item.id)}
                  onKeyDown={e => { if (e.key === "Enter") handleDiscSave(item.id); if (e.key === "Escape") setEditingDisc(null); }}
                  style={{ width: "56px", padding: "0.2rem 1.1rem 0.2rem 0.4rem", border: "1px solid #aaa", borderRadius: "4px", fontSize: "0.8rem", textAlign: "right" }}
                />
                <span style={{ position: "absolute", right: "0.35rem", fontSize: "0.7rem", color: "#aaa", pointerEvents: "none" }}>%</span>
              </div>
            ) : (
              <button
                title="Klicka för att ändra rabatt (%)"
                onClick={() => { setEditingDisc(item.id); setEditDiscVal(String(item.discountPercent || 0)); }}
                style={{
                  background: item.discountPercent > 0 ? "#f0fdf4" : "#fafafa",
                  border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.75rem",
                  color: item.discountPercent > 0 ? "#16a34a" : "#bbb", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                {item.discountPercent > 0 ? `−${item.discountPercent}%` : "0 %"}
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
      <div style={{ borderTop: "1px dashed #eee", marginTop: "0.75rem", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {/* Row 1: icon + name */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <IconSelectButton value={newIcon} onChange={setNewIcon} />
          <input
            placeholder="Namn på plagg…"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            style={{ flex: 1, padding: "0.4rem 0.6rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.8rem", color: "#333", outline: "none" }}
          />
        </div>
        {/* Row 2: price + discount + button */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
            <input
              type="number"
              placeholder="Pris"
              value={newPrice}
              onChange={e => { setNewPrice(e.target.value); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              style={{ width: "100%", padding: "0.4rem 2rem 0.4rem 0.6rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
            />
            <span style={{ position: "absolute", right: "0.5rem", fontSize: "0.75rem", color: "#aaa", pointerEvents: "none" }}>kr</span>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
            <input
              type="number"
              placeholder="Rabatt %"
              value={newDiscount}
              onChange={e => { setNewDiscount(e.target.value); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              title="Rabatt i procent (valfritt)"
              style={{ width: "100%", padding: "0.4rem 1.8rem 0.4rem 0.6rem", border: "1px solid #e5e5e5", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
            />
            <span style={{ position: "absolute", right: "0.5rem", fontSize: "0.75rem", color: "#aaa", pointerEvents: "none" }}>%</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{ padding: "0.4rem 0.75rem", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", opacity: adding ? 0.6 : 1, whiteSpace: "nowrap" }}
          >
            {adding ? "…" : "+ Lägg till"}
          </button>
        </div>
        {addError && <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.1rem" }}>{addError}</p>}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function StrukenTvattEditor({ initialProducts }: { initialProducts: StrukenProduct[] }) {
  const [products, setProducts] = useState<StrukenProduct[]>(initialProducts);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ category: "", name: "", price: "", discountPercent: "", icon: DEFAULT_ICON });
  const [newCatError, setNewCatError] = useState("");
  const [creatingNewLoading, setCreatingNewLoading] = useState(false);

  // Extract unique categories from products, sorted
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  // Group by category
  const byCategory = (cat: Category) =>
    products.filter(p => p.category === cat).sort((a, b) => a.order - b.order);

  async function handleAdd(category: string, name: string, price: number, discountPercent: number, icon: string) {
    const res = await fetch("/api/admin/struken-tvatt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, category, discountPercent, icon }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed");

    const maxOrder = products.filter(p => p.category === category).reduce((m, p) => Math.max(m, p.order), 0);
    setProducts(prev => [...prev, { id: json.id, name, price, category, order: maxOrder + 1, discountPercent, icon }]);
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

  async function handleUpdateDiscount(id: string, discountPercent: number) {
    const res = await fetch(`/api/admin/struken-tvatt/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountPercent }),
    });
    if (!res.ok) { alert("Kunde inte spara rabatt. Försök igen."); return; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, discountPercent } : p));
  }

  async function handleUpdateIcon(id: string, icon: string) {
    const res = await fetch(`/api/admin/struken-tvatt/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon }),
    });
    if (!res.ok) { alert("Kunde inte spara ikon. Försök igen."); return; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, icon } : p));
  }

  async function saveNewCategory() {
    if (!newCatForm.category.trim()) { setNewCatError("Ange ett kategorinamn."); return; }
    if (categories.includes(newCatForm.category.trim())) { setNewCatError("Kategorin finns redan."); return; }
    if (!newCatForm.name.trim()) { setNewCatError("Ange ett plaggnamn."); return; }
    const price = parseFloat(newCatForm.price);
    if (!newCatForm.price || isNaN(price) || price <= 0) { setNewCatError("Ange ett giltigt pris."); return; }

    setCreatingNewLoading(true);
    setNewCatError("");
    try {
      await handleAdd(newCatForm.category.trim(), newCatForm.name.trim(), price, clampPctInput(newCatForm.discountPercent), newCatForm.icon);
      setCreatingNew(false);
      setNewCatForm({ category: "", name: "", price: "", discountPercent: "", icon: DEFAULT_ICON });
    } catch (e: any) {
      setNewCatError(e.message ?? "Kunde inte skapa. Försök igen.");
    } finally {
      setCreatingNewLoading(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1.5rem" }}>
        Klicka på ett pris eller en rabatt (%) för att ändra det. Tryck på ✕ för att ta bort ett plagg.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {categories.map(cat => (
          <CategoryCard
            key={cat}
            category={cat}
            items={byCategory(cat)}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onUpdatePrice={handleUpdatePrice}
            onUpdateDiscount={handleUpdateDiscount}
            onUpdateIcon={handleUpdateIcon}
          />
        ))}

        {creatingNew ? (
          <div style={{ ...cardStyle, borderStyle: "dashed", borderColor: "#d1d5db" }}>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem", color: "#555" }}>Skapa ny kategori</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <Label>Kategorinamn</Label>
                <Input value={newCatForm.category} onChange={v => setNewCatForm(f => ({ ...f, category: v }))} placeholder="t.ex. Kostymer" />
              </div>
              <div>
                <Label>Plaggnamn</Label>
                <Input value={newCatForm.name} onChange={v => setNewCatForm(f => ({ ...f, name: v }))} placeholder="t.ex. Kostym väst" />
              </div>
              <div>
                <Label>Ikon</Label>
                <IconSelectButton value={newCatForm.icon} onChange={key => setNewCatForm(f => ({ ...f, icon: key }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <Label>Pris (kr)</Label>
                  <Input type="number" value={newCatForm.price} onChange={v => setNewCatForm(f => ({ ...f, price: v }))} />
                </div>
                <div>
                  <Label>Rabatt (%)</Label>
                  <Input type="number" value={newCatForm.discountPercent} onChange={v => setNewCatForm(f => ({ ...f, discountPercent: v }))} />
                </div>
              </div>
              {newCatError && <p style={errorStyle}>{newCatError}</p>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={saveNewCategory} disabled={creatingNewLoading} style={btnDark}>
                  {creatingNewLoading ? "…" : "Skapa kategori"}
                </button>
                <button onClick={() => { setCreatingNew(false); setNewCatForm({ category: "", name: "", price: "", discountPercent: "", icon: DEFAULT_ICON }); setNewCatError(""); }} style={btnGhost}>
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreatingNew(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "transparent", border: "2px dashed #d1d5db", borderRadius: "10px", cursor: "pointer", color: "#888", fontSize: "0.875rem", fontWeight: 500, width: "100%", justifyContent: "center" }}
          >
            + Ny kategori
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#666", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</label>;
}

function Input({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background:   "#fff",
  border:       "1px solid #eee",
  borderRadius: "10px",
  padding:      "1.1rem 1.25rem",
};
const errorStyle: React.CSSProperties = { color: "#dc2626", fontSize: "0.8rem" };
const btnDark: React.CSSProperties = { padding: "0.45rem 1rem", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "0.45rem 1rem", background: "transparent", color: "#555", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" };
