"use client";

import { useState } from "react";

export type Service = {
  id: string;
  name: string;
  description: string;
  price_ore: number;
  icon?: string;
  discountPercent?: number;
};

const EMPTY_FORM = { name: "", description: "", price_ore: 0, icon: "", discountPercent: 0 };

export default function ServicesEditor({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Service>>({});
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(service: Service) {
    setAdding(false);
    setEditing(service.id);
    setForm({ name: service.name, description: service.description, price_ore: service.price_ore, icon: service.icon, discountPercent: service.discountPercent ?? 0 });
    setError("");
  }

  function cancelEdit() {
    setEditing(null);
    setForm({});
    setError("");
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 403) window.location.href = "/admin/login";
        throw new Error(json.error ?? "Failed to save.");
      }
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...form } as Service : s));
      setEditing(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(id: string, name: string) {
    if (!confirm(`Remove "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setServices(prev => prev.filter(s => s.id !== id));
    } catch {
      alert("Failed to delete. Try again.");
    }
  }

  async function saveAdd() {
    if (!addForm.name.trim()) { setError("Name is required."); return; }
    if (!addForm.price_ore) { setError("Price is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      setServices(prev => [...prev, { ...addForm, id }]);
      setAdding(false);
      setAddForm({ ...EMPTY_FORM });
    } catch {
      setError("Failed to create. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {services.map(service => (
        <div key={service.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "1.25rem 1.5rem" }}>
          {editing === service.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <Label>Name</Label>
                  <Input value={form.name ?? ""} onChange={v => setForm(f => ({ ...f, name: v }))} />
                </div>
                <div>
                  <Label>Icon (emoji)</Label>
                  <Input value={form.icon ?? ""} onChange={v => setForm(f => ({ ...f, icon: v }))} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  value={form.description ?? ""}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", maxWidth: "420px" }}>
                <div>
                  <Label>Price (kr)</Label>
                  <Input
                    type="number"
                    value={String((form.price_ore ?? 0) / 100)}
                    onChange={v => setForm(f => ({ ...f, price_ore: Math.round(parseFloat(v) * 100) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Rabatt (%)</Label>
                  <Input
                    type="number"
                    value={String(form.discountPercent ?? 0)}
                    onChange={v => setForm(f => ({ ...f, discountPercent: clampPctInput(v) }))}
                  />
                </div>
              </div>
              {error && <p style={errorStyle}>{error}</p>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => saveEdit(service.id)} disabled={saving} style={btnDark}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={cancelEdit} style={btnGhost}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{service.icon || "🧵"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.2rem" }}>{service.name}</p>
                <p style={{ color: "#888", fontSize: "0.825rem" }}>{service.description}</p>
              </div>
              <div style={{ textAlign: "right", marginRight: "0.5rem" }}>
                <p style={{ fontWeight: 700, fontSize: "1rem", whiteSpace: "nowrap" }}>
                  {(service.price_ore / 100).toLocaleString("sv-SE")} kr
                </p>
                {(service.discountPercent ?? 0) > 0 && (
                  <span style={{ display: "inline-block", marginTop: 2, fontSize: "0.72rem", fontWeight: 600, color: "#16a34a", background: "#f0fdf4", borderRadius: "5px", padding: "1px 6px" }}>
                    −{service.discountPercent}%
                  </span>
                )}
              </div>
              <button onClick={() => startEdit(service)} style={{ ...btnGhost, fontSize: "0.8rem" }}>Edit</button>
              <button onClick={() => deleteService(service.id, service.name)} style={{ ...btnGhost, fontSize: "0.8rem", color: "#dc2626", borderColor: "#fca5a5" }}>
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div style={{ background: "#fff", border: "2px dashed #d1d5db", borderRadius: "10px", padding: "1.25rem 1.5rem" }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem", color: "#555" }}>New service</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <Label>Name</Label>
                <Input value={addForm.name} onChange={v => setAddForm(f => ({ ...f, name: v }))} />
              </div>
              <div>
                <Label>Icon (emoji)</Label>
                <Input value={addForm.icon} onChange={v => setAddForm(f => ({ ...f, icon: v }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                style={textareaStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", maxWidth: "420px" }}>
              <div>
                <Label>Price (kr)</Label>
                <Input
                  type="number"
                  value={addForm.price_ore ? String(addForm.price_ore / 100) : ""}
                  onChange={v => setAddForm(f => ({ ...f, price_ore: Math.round(parseFloat(v) * 100) || 0 }))}
                />
              </div>
              <div>
                <Label>Rabatt (%)</Label>
                <Input
                  type="number"
                  value={String(addForm.discountPercent)}
                  onChange={v => setAddForm(f => ({ ...f, discountPercent: clampPctInput(v) }))}
                />
              </div>
            </div>
            {error && <p style={errorStyle}>{error}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={saveAdd} disabled={saving} style={btnDark}>
                {saving ? "Saving…" : "Add service"}
              </button>
              <button onClick={() => { setAdding(false); setError(""); setAddForm({ ...EMPTY_FORM }); }} style={btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setAdding(true); setEditing(null); setError(""); }}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "transparent", border: "2px dashed #d1d5db", borderRadius: "10px", cursor: "pointer", color: "#888", fontSize: "0.875rem", fontWeight: 500, width: "100%", justifyContent: "center" }}
        >
          + Add service
        </button>
      )}
    </div>
  );
}

// Parse a percentage input into a clamped 0–100 integer.
function clampPctInput(v: string): number {
  const n = Math.round(parseFloat(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#666", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</label>;
}

function Input({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" }}
    />
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd", borderRadius: "6px",
  fontSize: "0.875rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
};
const errorStyle: React.CSSProperties = { color: "#dc2626", fontSize: "0.8rem" };
const btnDark: React.CSSProperties = { padding: "0.45rem 1rem", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "0.45rem 1rem", background: "transparent", color: "#555", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" };
