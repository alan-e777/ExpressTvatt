"use client";

import { useState } from "react";
import { PRODUCT_ICONS, getProductIcon } from "@/lib/productIcons";
import WarningsManager, { type ProductWarning } from "./WarningsManager";
import {
  compareCategories, resolveCategoryMeta, inputPlaceholderFor, requiresCustomerInput,
  DEFAULT_CATEGORY_ICON, DEFAULT_INPUT_LABEL, NEW_CATEGORY_ORDER,
  type CategoryMeta,
} from "@/lib/serviceCategories";

export type StrukenProduct = {
  id:              string;
  name:            string;
  price:           number;
  category:        string;
  order:           number;
  discountPercent: number;
  icon:            string;
  /** Ids of the reusable warnings that apply to this specific garment. */
  warningIds:      string[];
  /** Opts this item out of its category's customer-input requirement. */
  inputDisabled:    boolean;
  /** Overrides the category's placeholder for this item's note field. */
  inputPlaceholder: string;
};

const DEFAULT_ICON = PRODUCT_ICONS[0].key;

// A category needs a first garment to exist at all — the catalogue is what
// defines the category — so this form creates both in one go.
const EMPTY_NEW_CAT = {
  category: "", catIcon: DEFAULT_CATEGORY_ICON, desc: "", subtitle: "",
  name: "", price: "", discountPercent: "", icon: DEFAULT_ICON,
};

// Small grid popover for choosing one of the registered product icons.
function IconPicker({ value, onSelect, onClose }: { value: string; onSelect: (key: string) => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      {/* Columns are sized in fixed px and the box is `max-content`, so the grid
          always fits its own contents exactly — no scrollbar in either axis, and
          none of the clipping the previous 5×1fr/230px combination produced once
          the icon set grew past a couple of rows. */}
      <div style={{
        position: "absolute", zIndex: 41, top: "calc(100% + 4px)", left: 0,
        boxSizing: "border-box",
        background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "0.5rem",
        display: "grid", gridTemplateColumns: "repeat(7, 34px)", gap: "4px",
        width: "max-content", overflow: "hidden",
      }}>
        {PRODUCT_ICONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            title={label}
            onClick={() => { onSelect(key); onClose(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, padding: 0, borderRadius: "8px", cursor: "pointer",
              background: key === value ? "#1a1a1a" : "#f5f5f5",
              color: key === value ? "#fff" : "#555", border: "none",
            }}
          >
            <Icon size={18} stroke={1.5} />
          </button>
        ))}
      </div>
    </>
  );
}

// A button showing the current icon; opens the picker on click.
//
// `name` matters: a product saved before the icon picker existed has no stored
// key, and getProductIcon then falls back to a name heuristic ("Byxa" → sax).
// Passing the name here resolves the icon the same way app/order/page.tsx does,
// so the admin list and the site never show two different icons for one item.
function IconSelectButton({ value, name = "", onChange }: { value: string; name?: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = getProductIcon(value, name);
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
/**
 * Per-item warning picker. Attaching is done on the individual garment rather
 * than the category, so two items inside "Hem" can carry different remarks.
 */
function WarningSelectButton({
  selected,
  warnings,
  onToggle,
}: {
  selected: string[];
  warnings: ProductWarning[];
  onToggle: (warningId: string, next: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.length;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={count > 0 ? `${count} anmärkning(ar) kopplade` : "Koppla anmärkning"}
        style={{
          width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
          border: count > 0 ? "1px solid #fbbf24" : "1px solid #eee",
          background: count > 0 ? "#fef3c7" : "#fafafa",
          color: count > 0 ? "#b45309" : "#ccc",
          fontSize: "0.78rem", fontWeight: 700, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        !
      </button>

      {open && (
        <>
          {/* Click-away layer */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "28px", right: 0, zIndex: 41, width: "min(300px, 78vw)",
            background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "0.6rem", maxHeight: "260px", overflowY: "auto",
          }}>
            {warnings.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#aaa", lineHeight: 1.5 }}>
                Inga anmärkningar finns än. Skapa en under “Varningar &amp; bra att veta” högst upp.
              </p>
            ) : (
              warnings.map(w => {
                const checked = selected.includes(w.id);
                return (
                  <label
                    key={w.id}
                    style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start", padding: "0.35rem 0.2rem", cursor: "pointer", borderRadius: "5px" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => onToggle(w.id, e.target.checked)}
                      style={{ marginTop: "0.15rem", flexShrink: 0, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.76rem", color: "#444", lineHeight: 1.45 }}>{w.text}</span>
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Per-item control for the category's customer-input requirement: turn it off
 * for this one garment, and give it its own placeholder. Only rendered when the
 * category requires input at all, so it stays out of the way everywhere else.
 */
function InputSelectButton({
  disabled,
  placeholder,
  effectivePlaceholder,
  onChange,
}: {
  disabled: boolean;
  placeholder: string;
  effectivePlaceholder: string;
  onChange: (patch: { inputDisabled?: boolean; inputPlaceholder?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(placeholder);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => { setDraft(placeholder); setOpen(o => !o); }}
        title={disabled ? "Kundinput avstängd för detta plagg" : "Kräver kundinput — klicka för att ändra"}
        style={{
          width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
          border: disabled ? "1px solid #eee" : "1px solid #93c5fd",
          background: disabled ? "#fafafa" : "#dbeafe",
          color: disabled ? "#ccc" : "#1d4ed8",
          fontSize: "0.7rem", fontWeight: 700, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ✎
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "28px", right: 0, zIndex: 41, width: "min(300px, 78vw)",
            background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "0.7rem",
            display: "flex", flexDirection: "column", gap: "0.55rem",
          }}>
            <label style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!disabled}
                onChange={e => onChange({ inputDisabled: !e.target.checked })}
                style={{ marginTop: "0.15rem", flexShrink: 0, cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.76rem", color: "#444", lineHeight: 1.45 }}>
                Kräv kundinput för detta plagg
              </span>
            </label>
            <div>
              <Label>Egen platshållare</Label>
              <input
                type="text"
                value={draft}
                placeholder={effectivePlaceholder}
                onChange={e => setDraft(e.target.value)}
                onBlur={() => draft !== placeholder && onChange({ inputPlaceholder: draft })}
                onKeyDown={e => { if (e.key === "Enter") { onChange({ inputPlaceholder: draft }); setOpen(false); } }}
                style={{ width: "100%", padding: "0.35rem 0.5rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.78rem", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: "0.68rem", color: "#aaa", marginTop: "0.3rem", lineHeight: 1.4 }}>
                Lämna tomt för att använda kategorins platshållare.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Read-only twin of the circle on the customer's category row, so the admin can
// see at a glance which icon the site will draw for this category.
function CategoryIconPreview({ iconKey }: { iconKey: string }) {
  const Icon = getProductIcon(iconKey);
  return (
    <span style={{
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      width: 34, height: 34, borderRadius: "50%", background: "#f2f0e9", color: "#1a1a1a",
    }}>
      <Icon size={18} stroke={1.5} />
    </span>
  );
}

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
  meta,
  items,
  onAdd,
  onDelete,
  onUpdatePrice,
  onUpdateDiscount,
  onUpdateIcon,
  onUpdateName,
  onUpdateInput,
  onSaveMeta,
  warnings,
  onToggleWarning,
}: {
  category:         Category;
  meta:             CategoryMeta;
  onSaveMeta:       (patch: Partial<CategoryMeta>) => Promise<void>;
  items:            StrukenProduct[];
  onAdd:            (category: string, name: string, price: number, discountPercent: number, icon: string) => Promise<void>;
  onDelete:         (id: string) => Promise<void>;
  onUpdatePrice:    (id: string, price: number) => Promise<void>;
  onUpdateDiscount: (id: string, discountPercent: number) => Promise<void>;
  onUpdateIcon:     (id: string, icon: string) => Promise<void>;
  onUpdateName:     (id: string, name: string) => Promise<void>;
  onUpdateInput:    (id: string, patch: { inputDisabled?: boolean; inputPlaceholder?: string }) => Promise<void>;
  warnings:         ProductWarning[];
  onToggleWarning:  (id: string, warningId: string, next: boolean) => Promise<void>;
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

  // Inline name editing — renaming used to mean deleting the item and re-adding it.
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameVal, setEditNameVal] = useState("");

  // How this category is presented on the order page — icon, the two blurbs and
  // where it sits in the list. Collapsed by default so the card stays a price list.
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm]       = useState(meta);
  const [savingMeta, setSavingMeta]   = useState(false);

  function openMetaForm() {
    setMetaForm(meta);
    setEditingMeta(true);
  }

  async function saveMeta() {
    setSavingMeta(true);
    try {
      await onSaveMeta({
        icon:             metaForm.icon,
        desc:             metaForm.desc,
        subtitle:         metaForm.subtitle,
        order:            metaForm.order,
        requiresInput:    metaForm.requiresInput,
        inputLabel:       metaForm.inputLabel,
        inputPlaceholder: metaForm.inputPlaceholder,
      });
      setEditingMeta(false);
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleNameSave(id: string) {
    const name = editNameVal.trim();
    setEditingName(null);
    const current = items.find(i => i.id === id);
    if (!name || name === current?.name) return;
    await onUpdateName(id, name);
  }

  async function handleAdd() {
    if (!newName.trim()) { setAddError("Ange ett namn."); return; }
    const price = parseFloat(newPrice);
    // 0 is allowed on purpose — it creates a test item (see the hint below the
    // price field). Only a negative or unparseable price is rejected.
    if (!newPrice.trim() || isNaN(price) || price < 0) { setAddError("Ange ett giltigt pris."); return; }
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
    if (isNaN(price) || price < 0) { setEditingPrice(null); return; }
    await onUpdatePrice(id, price);
    setEditingPrice(null);
  }

  async function handleDiscSave(id: string) {
    await onUpdateDiscount(id, clampPctInput(editDiscVal));
    setEditingDisc(null);
  }

  return (
    <div style={cardStyle}>
      {/* Header — mirrors the row the customer sees on /order */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <CategoryIconPreview iconKey={meta.icon} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>{category}</p>
          <p style={{ fontSize: "0.75rem", color: meta.desc ? "#aaa" : "#d4a72c" }}>
            {meta.desc || "Ingen beskrivning — visas tom på sidan"}
          </p>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 500, whiteSpace: "nowrap" }}>
          {items.length} plagg
        </span>
        <button
          onClick={() => (editingMeta ? setEditingMeta(false) : openMetaForm())}
          title="Ändra ikon och beskrivning för kategorin"
          style={{ background: "none", border: "1px solid #eee", borderRadius: "6px", padding: "0.25rem 0.55rem", fontSize: "0.72rem", color: "#888", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {editingMeta ? "Stäng" : "Utseende"}
        </button>
      </div>

      {/* Category appearance — icon, both blurbs and its place in the list */}
      {editingMeta && (
        <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
            <div>
              <Label>Ikon</Label>
              <IconSelectButton value={metaForm.icon} onChange={key => setMetaForm(f => ({ ...f, icon: key }))} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>Kort beskrivning (i listan)</Label>
              <Input value={metaForm.desc} onChange={v => setMetaForm(f => ({ ...f, desc: v }))} placeholder="t.ex. Lagning & ändring" />
            </div>
            <div style={{ width: "90px", flexShrink: 0 }}>
              <Label>Ordning</Label>
              <Input type="number" value={String(metaForm.order)} onChange={v => setMetaForm(f => ({ ...f, order: Number(v) || 0 }))} />
            </div>
          </div>
          <div>
            <Label>Lång beskrivning (när kategorin öppnas)</Label>
            <Input value={metaForm.subtitle} onChange={v => setMetaForm(f => ({ ...f, subtitle: v }))} placeholder="t.ex. Uppläggning, blixtlås och ändringar — hämtning & leverans ingår" />
          </div>

          {/* Customer input — a tailoring category needs "korta 2 cm" to be
              actionable, so the customer is asked before the item is added. */}
          <div style={{ borderTop: "1px dashed #e5e5e5", paddingTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            <label style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={metaForm.requiresInput}
                onChange={e => setMetaForm(f => ({ ...f, requiresInput: e.target.checked }))}
                style={{ marginTop: "0.15rem", flexShrink: 0, cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.8rem", color: "#444", lineHeight: 1.45 }}>
                Kräv kundinput innan plagget läggs i kundvagnen
                <span style={{ display: "block", fontSize: "0.7rem", color: "#aaa", marginTop: "0.15rem" }}>
                  Stäng av för enskilda plagg med ✎ i listan ovan.
                </span>
              </span>
            </label>
            {metaForm.requiresInput && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <Label>Fråga till kunden</Label>
                  <Input value={metaForm.inputLabel} onChange={v => setMetaForm(f => ({ ...f, inputLabel: v }))} placeholder={DEFAULT_INPUT_LABEL} />
                </div>
                <div>
                  <Label>Platshållare (standard)</Label>
                  <Input value={metaForm.inputPlaceholder} onChange={v => setMetaForm(f => ({ ...f, inputPlaceholder: v }))} placeholder="t.ex. korta 2 cm" />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={saveMeta} disabled={savingMeta} style={{ ...btnDark, padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}>
              {savingMeta ? "…" : "Spara"}
            </button>
            <button onClick={() => setEditingMeta(false)} style={{ ...btnGhost, padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}>Avbryt</button>
          </div>
        </div>
      )}

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
            <IconSelectButton value={item.icon || ""} name={item.name} onChange={key => onUpdateIcon(item.id, key)} />

            {/* Name — click to edit inline */}
            {editingName === item.id ? (
              <input
                type="text"
                value={editNameVal}
                autoFocus
                onChange={e => setEditNameVal(e.target.value)}
                onBlur={() => handleNameSave(item.id)}
                onKeyDown={e => { if (e.key === "Enter") handleNameSave(item.id); if (e.key === "Escape") setEditingName(null); }}
                style={{ flex: 1, minWidth: 0, padding: "0.2rem 0.4rem", border: "1px solid #aaa", borderRadius: "4px", fontSize: "0.875rem", color: "#333", outline: "none" }}
              />
            ) : (
              <button
                title="Klicka för att ändra namn"
                onClick={() => { setEditingName(item.id); setEditNameVal(item.name); }}
                style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: "0.2rem 0", fontSize: "0.875rem", color: "#333", cursor: "pointer", fontFamily: "inherit" }}
              >
                {item.name}
              </button>
            )}

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
                title={item.price === 0 ? "Testartikel — 0 kr hoppar över Stripe helt" : "Klicka för att ändra pris"}
                onClick={() => { setEditingPrice(item.id); setEditPriceVal(String(item.price)); }}
                style={{
                  background: item.price === 0 ? "#7C2D12" : "#f5f5f5", border: "none", borderRadius: "4px",
                  padding: "0.2rem 0.5rem", fontSize: "0.8rem", color: item.price === 0 ? "#fff" : "#555",
                  cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                {item.price === 0 ? "TEST · 0 kr" : `${item.price} kr`}
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

            {/* Per-item customer input — only where the category asks for it */}
            {meta.requiresInput && (
              <InputSelectButton
                disabled={!!item.inputDisabled}
                placeholder={item.inputPlaceholder ?? ""}
                effectivePlaceholder={inputPlaceholderFor(meta, item)}
                onChange={patch => onUpdateInput(item.id, patch)}
              />
            )}

            {/* Per-item warnings */}
            <WarningSelectButton
              selected={item.warningIds ?? []}
              warnings={warnings}
              onToggle={(warningId, next) => onToggleWarning(item.id, warningId, next)}
            />

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
        <p style={{ fontSize: "0.68rem", color: "#bbb", lineHeight: 1.4 }}>
          Pris 0 kr skapar en <strong>testartikel</strong>: den syns bara för inloggade
          administratörer och en beställning med enbart sådana går aldrig via Stripe —
          ordern kan raderas utan återbetalning.
        </p>
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function StrukenTvattEditor({
  initialProducts,
  initialWarnings,
  initialCategoryMeta,
}: {
  initialProducts: StrukenProduct[];
  initialWarnings: ProductWarning[];
  initialCategoryMeta: CategoryMeta[];
}) {
  const [products, setProducts] = useState<StrukenProduct[]>(initialProducts);
  const [warnings, setWarnings] = useState<ProductWarning[]>(initialWarnings);
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta[]>(initialCategoryMeta);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ ...EMPTY_NEW_CAT });
  const [newCatError, setNewCatError] = useState("");
  const [creatingNewLoading, setCreatingNewLoading] = useState(false);

  // Presentation for one category: whatever is saved, else the shipped defaults.
  const metaFor = (cat: Category): CategoryMeta =>
    resolveCategoryMeta(cat, categoryMeta.find(m => m.name === cat));

  // The categories are whatever the products say they are — exactly what the
  // order page derives — sorted the same way the site sorts them.
  const categories = Array.from(new Set(products.map(p => p.category)))
    .map(metaFor)
    .sort(compareCategories)
    .map(m => m.name);

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
    setProducts(prev => [...prev, { id: json.id, name, price, category, order: maxOrder + 1, discountPercent, icon, warningIds: [], inputDisabled: false, inputPlaceholder: "" }]);
  }

  /**
   * Attach or detach a reusable warning on one garment. Applied optimistically
   * and rolled back on failure, matching the other inline edits here.
   */
  async function handleToggleWarning(id: string, warningId: string, next: boolean) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const previous = product.warningIds ?? [];
    const warningIds = next
      ? [...previous, warningId]
      : previous.filter(w => w !== warningId);

    setProducts(prev => prev.map(p => p.id === id ? { ...p, warningIds } : p));

    const res = await fetch(`/api/admin/struken-tvatt/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warningIds }),
    });
    if (!res.ok) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, warningIds: previous } : p));
      alert("Kunde inte spara anmärkningen. Försök igen.");
    }
  }

  /** How many garments a given warning is attached to. */
  const usageCount = (warningId: string) =>
    products.filter(p => (p.warningIds ?? []).includes(warningId)).length;

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

  async function handleUpdateName(id: string, name: string) {
    const previous = products.find(p => p.id === id)?.name;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    const res = await fetch(`/api/admin/struken-tvatt/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, name: previous ?? p.name } : p));
      alert("Kunde inte spara namnet. Försök igen.");
    }
  }

  /** Per-item input override — optimistic, rolled back on failure. */
  async function handleUpdateInput(id: string, patch: { inputDisabled?: boolean; inputPlaceholder?: string }) {
    const previous = products.find(p => p.id === id);
    if (!previous) return;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    const res = await fetch(`/api/admin/struken-tvatt/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setProducts(prev => prev.map(p => p.id === id ? previous : p));
      alert("Kunde inte spara kundinput-inställningen. Försök igen.");
    }
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

  /** Persist a category's appearance and mirror it locally. */
  async function saveCategoryMeta(category: string, patch: Partial<CategoryMeta>) {
    const next = { ...metaFor(category), ...patch, name: category };
    const res = await fetch("/api/admin/service-categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) { alert("Kunde inte spara kategorins utseende. Försök igen."); return; }
    setCategoryMeta(prev => {
      const without = prev.filter(m => m.name !== category);
      return [...without, next];
    });
  }

  async function saveNewCategory() {
    if (!newCatForm.category.trim()) { setNewCatError("Ange ett kategorinamn."); return; }
    if (categories.includes(newCatForm.category.trim())) { setNewCatError("Kategorin finns redan."); return; }
    if (!newCatForm.name.trim()) { setNewCatError("Ange ett plaggnamn."); return; }
    const price = parseFloat(newCatForm.price);
    if (!newCatForm.price.trim() || isNaN(price) || price < 0) { setNewCatError("Ange ett giltigt pris."); return; }

    setCreatingNewLoading(true);
    setNewCatError("");
    const category = newCatForm.category.trim();
    try {
      await handleAdd(category, newCatForm.name.trim(), price, clampPctInput(newCatForm.discountPercent), newCatForm.icon);
      // Sort new categories below the existing ones rather than tying with them.
      const maxOrder = categories.reduce((m, c) => Math.max(m, metaFor(c).order), 0);
      await saveCategoryMeta(category, {
        icon:     newCatForm.catIcon,
        desc:     newCatForm.desc.trim(),
        subtitle: newCatForm.subtitle.trim(),
        order:    Math.max(NEW_CATEGORY_ORDER, maxOrder + 10),
      });
      setCreatingNew(false);
      setNewCatForm({ ...EMPTY_NEW_CAT });
    } catch (e: any) {
      setNewCatError(e.message ?? "Kunde inte skapa. Försök igen.");
    } finally {
      setCreatingNewLoading(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1.5rem" }}>
        Klicka på namn, pris eller rabatt (%) för att ändra. Tryck på ! för att koppla en
        anmärkning till ett plagg, och på ✕ för att ta bort plagget.
      </p>

      <WarningsManager
        warnings={warnings}
        usageCount={usageCount}
        onChange={next => {
          setWarnings(next);
          // A deleted warning is detached server-side too; mirror that locally
          // so the "!" badges and usage counts stay truthful without a reload.
          const live = new Set(next.map(w => w.id));
          setProducts(prev =>
            prev.map(p => {
              const kept = (p.warningIds ?? []).filter(id => live.has(id));
              return kept.length === (p.warningIds ?? []).length ? p : { ...p, warningIds: kept };
            }),
          );
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {categories.map(cat => (
          <CategoryCard
            key={cat}
            category={cat}
            meta={metaFor(cat)}
            onSaveMeta={patch => saveCategoryMeta(cat, patch)}
            items={byCategory(cat)}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onUpdatePrice={handleUpdatePrice}
            onUpdateDiscount={handleUpdateDiscount}
            onUpdateIcon={handleUpdateIcon}
            onUpdateName={handleUpdateName}
            onUpdateInput={handleUpdateInput}
            warnings={warnings}
            onToggleWarning={handleToggleWarning}
          />
        ))}

        {creatingNew ? (
          <div style={{ ...cardStyle, borderStyle: "dashed", borderColor: "#d1d5db" }}>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem", color: "#555" }}>Skapa ny kategori</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
                <div>
                  <Label>Kategorins ikon</Label>
                  <IconSelectButton value={newCatForm.catIcon} onChange={key => setNewCatForm(f => ({ ...f, catIcon: key }))} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Label>Kategorinamn</Label>
                  <Input value={newCatForm.category} onChange={v => setNewCatForm(f => ({ ...f, category: v }))} placeholder="t.ex. Skrädderi" />
                </div>
              </div>
              <div>
                <Label>Kort beskrivning (i listan)</Label>
                <Input value={newCatForm.desc} onChange={v => setNewCatForm(f => ({ ...f, desc: v }))} placeholder="t.ex. Lagning & ändring" />
              </div>
              <div>
                <Label>Lång beskrivning (när kategorin öppnas)</Label>
                <Input value={newCatForm.subtitle} onChange={v => setNewCatForm(f => ({ ...f, subtitle: v }))} placeholder="t.ex. Uppläggning, blixtlås och ändringar" />
              </div>

              {/* A category exists only through its garments, so the first one is
                  created here together with it. */}
              <div style={{ borderTop: "1px dashed #eee", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Första plagget i kategorin
                </p>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
                  <div>
                    <Label>Plaggets ikon</Label>
                    <IconSelectButton value={newCatForm.icon} name={newCatForm.name} onChange={key => setNewCatForm(f => ({ ...f, icon: key }))} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Label>Plaggnamn</Label>
                    <Input value={newCatForm.name} onChange={v => setNewCatForm(f => ({ ...f, name: v }))} placeholder="t.ex. Kortning av byxa" />
                  </div>
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
              </div>
              {newCatError && <p style={errorStyle}>{newCatError}</p>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={saveNewCategory} disabled={creatingNewLoading} style={btnDark}>
                  {creatingNewLoading ? "…" : "Skapa kategori"}
                </button>
                <button onClick={() => { setCreatingNew(false); setNewCatForm({ ...EMPTY_NEW_CAT }); setNewCatError(""); }} style={btnGhost}>
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
