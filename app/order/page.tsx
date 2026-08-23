'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconStar, IconSpray,
  IconPlus, IconMinus, IconChevronUp, IconChevronRight, IconArrowLeft, IconX, IconCheck,
  IconTag,
} from '@tabler/icons-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { rutNetKr, rutRefundKr, RUT_DISCOUNT_PERCENT } from '@/lib/rut';
import { getProductIcon } from '@/lib/productIcons';
import {
  cartLineKey, categoryDocId, compareCategories, inputLabelFor, inputPlaceholderFor,
  requiresCustomerInput, resolveCategoryMeta, MATTVATT_CATEGORY,
  type CategoryMeta,
} from '@/lib/serviceCategories';
import { DISCOUNT_DEFAULTS, discountedUnitPrice, computeCartTotals, mattvattLinePct, type DiscountSettings } from '@/lib/discount';
import {
  MATTA_TYPES, MATTVATT_DEFAULTS, SQM_STEP, clampSqmToRange, formatSqm,
  mattaLineId, mattaLineName, mattaPriceKr, mattaTypeLabel,
  type MattaTypeId, type MattvattSettings,
} from '@/lib/mattvatt';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Slug of a category, used for the open/close state and the section anchor. */
type CatId         = string;
type StrukenProduct = { id: string; name: string; price: number; category: string; order: number; discountPercent?: number; icon?: string; warningIds?: string[]; inputDisabled?: boolean; inputPlaceholder?: string };
// `key` identifies the line, `id` identifies the product: one garment ordered
// twice with different notes ("korta 2 cm", "korta 5 cm") is two lines that
// still price from the same catalogue entry.
type CartItem      = { key: string; id: string; name: string; price: number; quantity: number; type: 'mattvätt' | 'struken' | 'service'; serviceId?: string; note?: string };

/** The tile that opened the note panel, and everything the panel needs to show. */
type InputTarget = { id: string; name: string; price: number; label: string; placeholder: string };
/** Pixel geometry of the note panel, measured against the live grid. */
type PanelRect   = { top: number; left: number; width: number; height: number };

/**
 * Which cells the note panel covers, given the column the tile sits in. Two to
 * the right when they both exist, otherwise two to the left; on a two-column
 * phone it is a single cell on whichever side is free. The tile that opened the
 * panel is never covered — it stays flush against it, so the customer can see
 * the item they are describing.
 */
function panelPlacement(col: number, cols: number): { start: number; span: number } {
  const maxSpan = cols <= 2 ? 1 : 2;
  for (let span = maxSpan; span >= 1; span--) {
    if (col + span <= cols - 1) return { start: col + 1, span };
    if (col - span >= 0)        return { start: col - span, span };
  }
  return { start: col, span: 1 };  // single-column grid: cover the tile itself
}

// ── Categories ────────────────────────────────────────────────────────────────
// Derived, never hard-coded: every distinct `category` on a StrukenTvatt product
// is a row here, so a category the admin creates under Tjänster shows up on its
// own instead of vanishing. `service_categories` supplies icon, blurbs and sort
// order; `lib/serviceCategories.ts` fills in defaults for anything unset.
//
// Mattvätt is the single built-in: it is priced per m² from settings/mattvatt
// and has no catalogue products, so it is always present.
const MATTVATT_ID = categoryDocId(MATTVATT_CATEGORY);

type CatView = CategoryMeta & {
  id:         CatId;
  isMattvatt: boolean;
  Icon:       React.ComponentType<{ size: number; stroke: number }>;
};

// The two mattvätt types. Both are priced per m² from settings/mattvatt, which
// the admin edits in Inställningar — the server re-derives the price from the
// same doc in create-cart-payment.
const MATTA_TYPE_ICONS: Record<MattaTypeId, React.ComponentType<{ size: number; stroke: number }>> = {
  'matta-normal': IconSpray,
  'matta-akta':   IconStar,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="of-prod-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ aspectRatio: '3 / 5', borderRadius: 16 }} />
      ))}
    </div>
  );
}

// Quantity readout that gives a tiny pulse whenever the value changes
function PulseQty({ value }: { value: number }) {
  const [pulse, setPulse] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setPulse(true);
  }, [value]);
  return (
    <span className="prod-step-qty">
      <span className={pulse ? 'of-pulse' : ''} onAnimationEnd={() => setPulse(false)}>{value}</span>
    </span>
  );
}

/**
 * "Bra att veta" marker on a product tile.
 *
 * Opens on hover for pointer devices and on tap for touch, where hover does not
 * exist. Clicks are swallowed so tapping the marker never adds the item to the
 * cart — the whole tile is a button.
 */
function WarningBadge({ texts, label }: { texts: string[]; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="prod-warn"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="prod-warn-btn"
        aria-label={`Bra att veta om ${label}`}
        aria-expanded={open}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        onKeyDown={e => e.stopPropagation()}
      >
        !
      </button>
      {open && (
        <span className="prod-warn-pop" role="tooltip" onClick={e => e.stopPropagation()}>
          {texts.map((t, i) => (
            <span key={i} className="prod-warn-line">{t}</span>
          ))}
        </span>
      )}
    </span>
  );
}

// ── HomePage ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  const [strukenCatalog, setStrukenCatalog] = useState<Record<string, StrukenProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [openCat, setOpenCat]         = useState<CatId | null>(null);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [rutAvdrag, setRutAvdrag]     = useState(false);
  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(DISCOUNT_DEFAULTS);
  const [deliverySettings, setDeliverySettings] = useState<{ freeDeliveryThresholdKr: number; deliveryFeeKr: number }>({ freeDeliveryThresholdKr: 0, deliveryFeeKr: 0 });
  const [isFirstTime, setIsFirstTime]           = useState(false);
  // 0 kr test items are only shown to a signed-in admin — a customer offered a
  // 0 kr tile would just be refused at checkout. Server-enforced regardless.
  const [testMode, setTestMode]                 = useState(false);
  const [userId, setUserId]                     = useState<string | undefined>();
  // Reusable "bra att veta" remarks, keyed by id and referenced per product.
  const [warnings, setWarnings]                 = useState<Record<string, string>>({});
  // Per-category icon / blurbs / sort order, as edited under admin → Tjänster.
  const [categoryMeta, setCategoryMeta]         = useState<CategoryMeta[]>([]);
  // The note panel: which tile opened it, what the customer has typed, and where
  // it sits. `inputRect` is measured from the live grid — see measureInputRect.
  const [inputTarget, setInputTarget]           = useState<InputTarget | null>(null);
  const [inputNote, setInputNote]               = useState('');
  const [inputRect, setInputRect]               = useState<PanelRect | null>(null);
  const gridRef                                 = useRef<HTMLDivElement | null>(null);
  const tileRefs                                = useRef<Record<string, HTMLDivElement | null>>({});
  // Mattvätt is picked as type + size: the slider only appears once a type is
  // chosen, and its range comes from the admin's settings.
  const [mattvatt, setMattvatt]                 = useState<MattvattSettings>(MATTVATT_DEFAULTS);
  const [mattaType, setMattaType]               = useState<MattaTypeId | null>(null);
  const [mattaSqm, setMattaSqm]                 = useState<number>(MATTVATT_DEFAULTS.minSqm);

  // Fetch the unified product catalogue (all categories live in StrukenTvatt)
  useEffect(() => {
    fetch('/api/struken-tvatt')
      .then(r => r.json() as Promise<StrukenProduct[]>)
      .then(products => {
        const grouped: Record<string, StrukenProduct[]> = {};
        for (const p of products) {
          (grouped[p.category] ??= []).push(p);
        }
        for (const cat of Object.keys(grouped)) grouped[cat].sort((a, b) => a.order - b.order);
        setStrukenCatalog(grouped);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));

    fetch('/api/warnings')
      .then(r => r.json() as Promise<Record<string, string>>)
      .then(setWarnings)
      .catch(() => {});

    // Presentation only — a category with no doc here still renders, on the
    // defaults, so the list never depends on this request succeeding.
    fetch('/api/service-categories')
      .then(r => r.json() as Promise<CategoryMeta[]>)
      .then(metas => Array.isArray(metas) && setCategoryMeta(metas))
      .catch(() => {});
  }, []);

  // Discount settings (public) + first-time eligibility (logged-in customers only)
  useEffect(() => {
    fetch('/api/discount-settings')
      .then(r => r.json() as Promise<DiscountSettings>)
      .then(setDiscountSettings)
      .catch(() => {});
    fetch('/api/delivery-settings')
      .then(r => r.json() as Promise<{ freeDeliveryThresholdKr: number; deliveryFeeKr: number }>)
      .then(setDeliverySettings)
      .catch(() => {});
    fetch('/api/mattvatt-settings')
      .then(r => r.json() as Promise<MattvattSettings>)
      .then(settings => {
        setMattvatt(settings);
        // Pull the slider into the admin's range as soon as it is known.
        setMattaSqm(v => clampSqmToRange(v, settings));
      })
      .catch(() => {});
  }, []);

  // First-time eligibility comes from the server, which decides it with the same
  // function the payment route prices with — so the discount advertised here is
  // always the discount actually applied. The customer's own Firestore doc is
  // client-writable and therefore not usable for pricing.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUserId(u?.uid);
      if (!u) { setIsFirstTime(false); setTestMode(false); return; }
      try {
        const token = await u.getIdToken();
        const [firstRes, testRes] = await Promise.all([
          fetch('/api/first-time-eligibility', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/test-mode',              { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setIsFirstTime(!!(await firstRes.json())?.isFirstTime);
        setTestMode(!!(await testRes.json())?.enabled);
      } catch {
        setIsFirstTime(false);
        setTestMode(false);
      }
    });
    return unsub;
  }, []);

  // Per-item discount % by line id (struken from the product, mattvätt from settings).
  const discountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const list of Object.values(strukenCatalog)) {
      for (const p of list) map[p.id] = p.discountPercent ?? 0;
    }
    return map;
  }, [strukenCatalog]);
  // Mattvätt lines are (type × size), so their discount is resolved from the id
  // rather than from a lookup table.
  const perItemPct = (id: string) =>
    id.startsWith('matta-')
      ? mattvattLinePct(discountSettings.mattvatt, id)
      : (discountById[id] ?? 0);

  // Cart helpers — a line is (product + note), so two notes on one garment stay
  // two lines instead of collapsing into a quantity of two.
  function addToCart(item: Omit<CartItem, 'quantity' | 'key'>) {
    const key = cartLineKey(item.id, item.note);
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, key, quantity: 1 }];
    });
  }
  function removeFromCart(key: string) {
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(i => i.key !== key);
      return prev.map(i => i.key === key ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }
  /** Quantity of one exact line. For a product with no note, key === id. */
  function cartQty(key: string) { return cart.find(i => i.key === key)?.quantity ?? 0; }
  /** Quantity across every note of one product — what a note-required tile shows. */
  function productQty(id: string) { return cart.filter(i => i.id === id).reduce((s, i) => s + i.quantity, 0); }

  function handleCheckout() {
    if (cart.length === 0) return;
    const items = cart.map(i => ({
      id: i.id, name: i.name, price: i.price, qty: i.quantity, type: i.type,
      ...(i.note ? { note: i.note } : {}),
    }));
    const rutParam = rutAvdrag ? '&rut=1' : '';
    router.push(`/kassa?cart=${encodeURIComponent(JSON.stringify(items))}${rutParam}`);
  }

  const { subtotalKr, totalKr: cartTotal, savingsKr } = computeCartTotals(
    cart.map(i => ({ id: i.id, price: i.price, qty: i.quantity })),
    perItemPct,
    { firstTimeDiscountPercent: discountSettings.firstTimeDiscountPercent, multipleDiscountsAllowed: discountSettings.multipleDiscountsAllowed },
    isFirstTime,
  );
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const deliveryFeeKr = cartCount > 0 && cartTotal < deliverySettings.freeDeliveryThresholdKr
    ? deliverySettings.deliveryFeeKr
    : 0;
  // RUT-avdrag is deducted directly (items only, never delivery), so the total
  // reflects the discount immediately as soon as a product is added.
  const rutDiscountKr = rutAvdrag ? rutRefundKr(cartTotal) : 0;
  const grandTotalKr = cartTotal - rutDiscountKr + deliveryFeeKr;

  // 0 kr test items are filtered out at the source rather than at render, so a
  // category holding nothing but test items does not show a customer an empty
  // category either.
  const visibleCatalog = useMemo(() => {
    if (testMode) return strukenCatalog;
    const out: Record<string, StrukenProduct[]> = {};
    for (const [cat, list] of Object.entries(strukenCatalog)) {
      const kept = list.filter(p => p.price > 0);
      if (kept.length) out[cat] = kept;
    }
    return out;
  }, [strukenCatalog, testMode]);

  // The rows the customer sees: one per category present in the catalogue, plus
  // the built-in mattvätt, ordered the way the admin ordered them.
  const categories: CatView[] = useMemo(() => {
    const stored = new Map(categoryMeta.map(m => [m.name, m]));
    const names  = new Set<string>([...Object.keys(visibleCatalog), MATTVATT_CATEGORY]);
    return [...names]
      .map(name => resolveCategoryMeta(name, stored.get(name)))
      .sort(compareCategories)
      .map(meta => ({
        ...meta,
        id:         categoryDocId(meta.name),
        isMattvatt: meta.name === MATTVATT_CATEGORY,
        Icon:       getProductIcon(meta.icon),
      }));
  }, [visibleCatalog, categoryMeta]);

  // Map every catalogue product id → its category, for the per-category badges.
  // Mattvätt lines are matched on their cart type instead: their ids carry the
  // chosen size, so they are not known up front.
  const idToCat = useMemo(() => {
    const map: Record<string, CatId> = {};
    for (const cat of categories) {
      if (cat.isMattvatt) continue;
      for (const p of visibleCatalog[cat.name] ?? []) map[p.id] = cat.id;
    }
    return map;
  }, [categories, visibleCatalog]);

  const catOf = (item: CartItem): CatId | undefined =>
    item.type === 'mattvätt' ? MATTVATT_ID : idToCat[item.id];

  const countFor = (id: CatId) =>
    cart.filter(i => catOf(i) === id).reduce((s, i) => s + i.quantity, 0);

  // Close the sheet automatically if the cart empties out
  useEffect(() => { if (cartCount === 0 && sheetOpen) setSheetOpen(false); }, [cartCount, sheetOpen]);

  // `?? null` matters now that the list is data-driven: a category the admin
  // just emptied can disappear while its detail view is open.
  const openMeta = openCat ? (categories.find(c => c.id === openCat) ?? null) : null;
  const openProducts = openMeta && !openMeta.isMattvatt ? (visibleCatalog[openMeta.name] ?? []) : [];

  // The rug the size slider currently describes — null until a type is picked.
  // `basePrice` is kr/m² × m², the same figure create-cart-payment recomputes.
  const mattaLine = (() => {
    if (!mattaType) return null;
    const id        = mattaLineId(mattaType, mattaSqm);
    const basePrice = mattaPriceKr(mattvatt, mattaType, mattaSqm);
    const netPrice  = discountedUnitPrice(basePrice, perItemPct(id), 0, discountSettings.multipleDiscountsAllowed);
    return {
      id,
      name:  mattaLineName(mattaType, mattaSqm),
      basePrice,
      shownPrice: rutAvdrag ? rutNetKr(netPrice) : netPrice,
      qty: cartQty(id),
    };
  })();

  // ── Note panel ──────────────────────────────────────────────────────────────
  // Placed by measuring the live grid rather than by CSS: the panel has to line
  // up with cells the tiles occupy, and it must not participate in the grid
  // itself or auto-placement would shove every tile after it out of position.
  const measureInputRect = useCallback(() => {
    const grid = gridRef.current;
    const tile = inputTarget ? tileRefs.current[inputTarget.id] : null;
    if (!grid || !tile) { setInputRect(null); return; }

    const g   = grid.getBoundingClientRect();
    const t   = tile.getBoundingClientRect();
    const cs  = getComputedStyle(grid);
    const gap = parseFloat(cs.columnGap) || 0;
    // The used value resolves to one length per track, so counting them gives
    // the column count at the current breakpoint (2 / 3 / 4).
    const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    if (!t.width || !cols) { setInputRect(null); return; }

    const col = Math.round((t.left - g.left) / (t.width + gap));
    const { start, span } = panelPlacement(col, cols);
    setInputRect({
      top:    t.top - g.top,
      left:   start * (t.width + gap),
      width:  span * t.width + (span - 1) * gap,
      height: t.height,
    });
  }, [inputTarget]);

  useEffect(() => {
    if (!inputTarget) { setInputRect(null); return; }
    measureInputRect();
    window.addEventListener('resize', measureInputRect);
    return () => window.removeEventListener('resize', measureInputRect);
  }, [inputTarget, measureInputRect]);

  const closeInput = () => { setInputTarget(null); setInputNote(''); };

  // Leaving the category takes the panel with it.
  useEffect(() => { setInputTarget(null); setInputNote(''); }, [openCat]);

  function confirmInput() {
    const note = inputNote.trim();
    if (!inputTarget || !note) return;
    addToCart({ id: inputTarget.id, name: inputTarget.name, price: inputTarget.price, type: 'struken', note });
    closeInput();
  }

  // A single product tile (mattvätt + catalogue items share the same shape)
  function ProductTile({ id, name, price, Icon, type, warningTexts = [], needsInput = false, isTest = false, onOpenInput, innerRef }: {
    id: string; name: string; price: number;
    Icon: React.ComponentType<{ size: number; stroke: number }>;
    type: CartItem['type'];
    warningTexts?: string[];
    /** Product whose category asks for a note — the tile opens the panel instead of adding. */
    needsInput?: boolean;
    /** 0 kr test item — only ever rendered for an admin, and flagged as such. */
    isTest?: boolean;
    onOpenInput?: () => void;
    innerRef?: (el: HTMLDivElement | null) => void;
  }) {
    // A note-required product can hold several lines at once, so the tile counts
    // all of them and never offers a stepper — which one would minus remove?
    const qty = needsInput ? productQty(id) : cartQty(id);
    const stop = (e: React.MouseEvent) => e.stopPropagation();
    const activate = () => (needsInput ? onOpenInput?.() : addToCart({ id, name, price, type }));
    // Item-level discount applies to the displayed price; RUT preview (refund) layers on top.
    const itemPrice = discountedUnitPrice(price, perItemPct(id), 0, discountSettings.multipleDiscountsAllowed);
    const shownPrice = rutAvdrag ? rutNetKr(itemPrice) : itemPrice;
    const showStrike = shownPrice !== price;
    return (
      <div
        ref={innerRef}
        className={`prod-tile${qty > 0 ? ' of-active' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={needsInput ? `${name} — beskriv vad som ska göras` : `Lägg till ${name}`}
        style={{ cursor: 'pointer' }}
        onClick={activate}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
      >
        {warningTexts.length > 0 && <WarningBadge texts={warningTexts} label={name} />}
        {isTest && <span className="of-test-badge">TEST</span>}
        <div className="prod-tile-icon"><Icon size={22} stroke={1.5} /></div>
        <div className="prod-tile-name">{name}</div>
        <div className="prod-tile-foot">
          <div
            className="prod-tile-price"
            style={showStrike ? { flexDirection: 'column', alignItems: 'center', gap: '2px' } : undefined}
          >
            {showStrike ? (
              <>
                <span style={{ textDecoration: 'line-through', fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                  {price} kr
                </span>
                <span style={{ color: 'var(--forest-dark)', lineHeight: 1.2 }}>
                  {shownPrice} kr
                </span>
              </>
            ) : (
              <>{price} kr</>
            )}
            <span className="prod-tile-per">/st</span>
          </div>
          {needsInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {qty > 0 && <span className="of-tile-qty">{qty}</span>}
              <button className="of-add-btn" aria-label={`${name} — beskriv vad som ska göras`} onClick={e => { stop(e); activate(); }}>
                <IconPlus size={18} stroke={2.5} />
              </button>
            </div>
          ) : qty === 0 ? (
            <button className="of-add-btn" aria-label={`Lägg till ${name}`} onClick={e => { stop(e); addToCart({ id, name, price, type }); }}>
              <IconPlus size={18} stroke={2.5} />
            </button>
          ) : (
            <div className="prod-stepper" onClick={stop}>
              <button className="prod-step-btn" aria-label={`Ta bort ${name}`} onClick={e => { stop(e); removeFromCart(id); }}>
                <IconMinus size={13} stroke={2.5} />
              </button>
              <PulseQty value={qty} />
              <button className="prod-step-btn" aria-label={`Lägg till ${name}`} onClick={e => { stop(e); addToCart({ id, name, price, type }); }}>
                <IconPlus size={13} stroke={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`of-flow of-flow-order${cartCount > 0 ? ' has-bar' : ''}`}>

      {/* Progress indicator */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-xl)' }}>
        <ol style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--moss)', color: 'var(--forest-dark)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>1</span>
            <span style={{ color: 'var(--forest-light)', fontWeight: 500 }}>Välj tjänster</span>
          </li>
          <li style={{ color: 'var(--forest-light)', opacity: 0.4 }}>—</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--moss)', color: 'var(--forest-dark)',
              border: '0.5px solid rgba(14,92,91,0.25)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>2</span>
            <span style={{ color: 'var(--forest-light)', opacity: 0.6 }}>Uppgifter &amp; datum</span>
          </li>
        </ol>
      </div>

      {/* ── First-time discount banner — only logged-in users who haven't ordered yet ── */}
      {isFirstTime && discountSettings.firstTimeDiscountPercent > 0 && (
        <div style={{
          background: 'var(--forest-dark)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px var(--sp-xl)',
          marginBottom: 'var(--sp-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-md)',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--moss)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IconTag size={18} stroke={2} color="var(--forest-dark)" />
          </div>
          <div>
            <div style={{ color: 'var(--moss)', fontWeight: 700, fontSize: 16, lineHeight: 1.2, marginBottom: 3 }}>
              {discountSettings.firstTimeDiscountPercent}% förstagångsrabatt
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.4 }}>
              Välkommen! Din rabatt läggs till automatiskt i kassan.
            </div>
          </div>
        </div>
      )}

      {/* ── RUT-avdrag toggle — discrete, persists across list & detail ──── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-lg)' }}>
        <button
          type="button"
          onClick={() => setRutAvdrag(v => !v)}
          aria-pressed={rutAvdrag}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            color: rutAvdrag ? 'var(--forest-dark)' : 'var(--forest-light)',
            background: rutAvdrag ? 'var(--linen)' : 'transparent',
            border: `0.5px solid ${rutAvdrag ? 'var(--moss)' : 'rgba(74,124,89,0.3)'}`,
            transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 16, height: 16, borderRadius: 5, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: rutAvdrag ? 'none' : '1.5px solid rgba(74,124,89,0.45)',
              background: rutAvdrag ? 'var(--forest-dark)' : 'transparent',
            }}
          >
            {rutAvdrag && <IconCheck size={11} stroke={2.75} color="var(--moss)" />}
          </span>
          Visa pris med RUT-avdrag
          <span style={{
            background: rutAvdrag ? 'var(--forest-dark)' : 'rgba(74,124,89,0.12)',
            color: rutAvdrag ? 'var(--moss)' : 'var(--forest-light)',
            borderRadius: 'var(--radius-pill)', padding: '1px 7px',
            fontSize: 11, fontWeight: 600,
          }}>
            −{RUT_DISCOUNT_PERCENT}%
          </span>
        </button>
      </div>

      {/* ── List view: category rows ─────────────────────────────────────── */}
      {openCat === null && (
        <div className="service-card" id="services">
          <div className="of-cat-list">
            {/* The rows come from the catalogue, so there is nothing truthful to
                draw until it lands — placeholders rather than a partial list. */}
            {loadingProducts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="of-cat-row" style={{ cursor: 'default' }} aria-hidden="true">
                  <span className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                  <span className="of-cat-text" style={{ display: 'grid', gap: 6 }}>
                    <span className="skeleton" style={{ width: '38%', height: 13, borderRadius: 4 }} />
                    <span className="skeleton" style={{ width: '58%', height: 11, borderRadius: 4 }} />
                  </span>
                </div>
              ))
            ) : categories.map(({ id, name, desc, Icon }) => {
              const count = countFor(id);
              return (
                <button key={id} className="of-cat-row" onClick={() => setOpenCat(id)}>
                  <span className="of-cat-icon"><Icon size={20} stroke={1.5} /></span>
                  <span className="of-cat-text">
                    <span className="of-cat-title">{name}</span>
                    {desc && <span className="of-cat-desc" style={{ display: 'block' }}>{desc}</span>}
                  </span>
                  {count > 0 && <span className="of-cat-badge">{count}</span>}
                  <span className="of-cat-chev"><IconChevronRight size={18} stroke={1.75} /></span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail view: the opened category replaces the list ───────────── */}
      {openMeta && (
        <div className="service-card" id={openMeta.id}>
          <button className="of-back" onClick={() => setOpenCat(null)}>
            <IconArrowLeft size={16} stroke={1.75} /> Tillbaka
          </button>
          <div className="of-detail-head">
            <span className="icon-circle" style={{ width: 36, height: 36 }}><openMeta.Icon size={16} stroke={1.5} /></span>
            <div>
              <div className="of-detail-title">{openMeta.name}</div>
              {openMeta.subtitle && <div className="of-detail-sub">{openMeta.subtitle}</div>}
            </div>
          </div>

          {/* Mattvätt — pick a type, then set the size on the slider */}
          {openMeta.isMattvatt && (
            <>
              <div className="of-matta-types">
                {MATTA_TYPES.map(t => {
                  const TypeIcon = MATTA_TYPE_ICONS[t.id];
                  const selected = mattaType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`of-matta-type${selected ? ' of-active' : ''}`}
                      aria-pressed={selected}
                      onClick={() => setMattaType(t.id)}
                    >
                      <span className="of-matta-type-icon"><TypeIcon size={20} stroke={1.5} /></span>
                      <span className="of-matta-type-text">
                        <span className="of-matta-type-name">{t.label}</span>
                        <span className="of-matta-type-desc">{t.desc}</span>
                      </span>
                      <span className="of-matta-type-price">
                        {mattvatt.pricePerSqmKr[t.id]} kr<span className="of-matta-type-per"> / m²</span>
                      </span>
                      <span className={`of-matta-type-mark${selected ? ' of-on' : ''}`} aria-hidden="true">
                        {selected && <IconCheck size={12} stroke={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Size slider — unlocked by the choice above */}
              {mattaLine && mattaType ? (
                <div className="of-matta-panel">
                  <div className="of-matta-panel-top">
                    <span className="of-matta-panel-label">Mattans storlek</span>
                    <span className="of-matta-panel-value">{formatSqm(mattaSqm)} m²</span>
                  </div>
                  <input
                    type="range"
                    className="of-matta-range"
                    min={mattvatt.minSqm}
                    max={mattvatt.maxSqm}
                    step={SQM_STEP}
                    value={mattaSqm}
                    aria-label="Mattans storlek i kvadratmeter"
                    onChange={e => setMattaSqm(clampSqmToRange(e.target.value, mattvatt))}
                  />
                  <div className="of-matta-scale">
                    <span>{formatSqm(mattvatt.minSqm)} m²</span>
                    <span>{formatSqm(mattvatt.maxSqm)} m²</span>
                  </div>

                  <div className="of-matta-foot">
                    <div className="of-matta-sum">
                      <span className="of-matta-sum-label">
                        {mattaTypeLabel(mattaType)} · {mattvatt.pricePerSqmKr[mattaType]} kr/m²
                      </span>
                      <span className="of-matta-sum-price">
                        {mattaLine.shownPrice !== mattaLine.basePrice && (
                          <span className="of-matta-sum-was">{mattaLine.basePrice} kr</span>
                        )}
                        {mattaLine.shownPrice} kr
                      </span>
                    </div>
                    {mattaLine.qty === 0 ? (
                      <button
                        type="button"
                        className="of-matta-add"
                        onClick={() => addToCart({ id: mattaLine.id, name: mattaLine.name, price: mattaLine.basePrice, type: 'mattvätt' })}
                      >
                        <IconPlus size={16} stroke={2.5} /> Lägg till
                      </button>
                    ) : (
                      <div className="prod-stepper">
                        <button className="prod-step-btn" aria-label={`Ta bort ${mattaLine.name}`} onClick={() => removeFromCart(mattaLine.id)}>
                          <IconMinus size={13} stroke={2.5} />
                        </button>
                        <PulseQty value={mattaLine.qty} />
                        <button className="prod-step-btn" aria-label={`Lägg till ${mattaLine.name}`} onClick={() => addToCart({ id: mattaLine.id, name: mattaLine.name, price: mattaLine.basePrice, type: 'mattvätt' })}>
                          <IconPlus size={13} stroke={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="of-matta-hint">Välj typ av matta ovan för att ställa in storleken.</p>
              )}
            </>
          )}

          {/* Catalogue-backed categories — product grid */}
          {!openMeta.isMattvatt && (
            loadingProducts ? <SkeletonRows count={6} /> : openProducts.length === 0 ? (
              <p className="small" style={{ color: 'var(--text-muted)', padding: 'var(--sp-md) 0' }}>Inga produkter tillgängliga just nu.</p>
            ) : (
              <div className="of-prod-grid" ref={gridRef}>
                {openProducts.map(p => {
                  const needsInput = requiresCustomerInput(openMeta, p);
                  return (
                    <ProductTile
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      price={p.price}
                      Icon={getProductIcon(p.icon, p.name)}
                      type="struken"
                      warningTexts={(p.warningIds ?? []).map(w => warnings[w]).filter(Boolean)}
                      needsInput={needsInput}
                      isTest={p.price === 0}
                      innerRef={needsInput ? (el => { tileRefs.current[p.id] = el; }) : undefined}
                      onOpenInput={() => {
                        setInputNote('');
                        setInputTarget({
                          id:          p.id,
                          name:        p.name,
                          price:       p.price,
                          label:       inputLabelFor(openMeta),
                          placeholder: inputPlaceholderFor(openMeta, p),
                        });
                      }}
                    />
                  );
                })}

                {/* The note panel, lifted over the cells beside its tile */}
                {inputTarget && inputRect && (
                  <>
                    <div className="of-input-scrim" onClick={closeInput} />
                    <div
                      className="of-input-layer"
                      // minHeight, not height: on a narrow phone cell the panel's
                      // own content is taller than one tile, and it may grow down
                      // over the row below — it is a layer, not a grid item.
                      style={{ top: inputRect.top, left: inputRect.left, width: inputRect.width, minHeight: inputRect.height }}
                      role="dialog"
                      aria-modal="true"
                      aria-label={`${inputTarget.name} — ${inputTarget.label}`}
                    >
                      <div className="of-input-head">
                        <span className="of-input-name">{inputTarget.name}</span>
                        <button type="button" className="of-input-close" onClick={closeInput} aria-label="Stäng">
                          <IconX size={15} stroke={1.75} />
                        </button>
                      </div>
                      <label className="of-input-label" htmlFor="of-input-field">{inputTarget.label}</label>
                      <textarea
                        id="of-input-field"
                        className="of-input-field"
                        autoFocus
                        value={inputNote}
                        placeholder={inputTarget.placeholder}
                        onChange={e => setInputNote(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') closeInput();
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmInput(); }
                        }}
                      />
                      <div className="of-input-foot">
                        <span className="of-input-price">
                          {(() => {
                            const net = discountedUnitPrice(inputTarget.price, perItemPct(inputTarget.id), 0, discountSettings.multipleDiscountsAllowed);
                            return rutAvdrag ? rutNetKr(net) : net;
                          })()} kr
                        </span>
                        <button type="button" className="of-input-add" disabled={!inputNote.trim()} onClick={confirmInput}>
                          <IconPlus size={15} stroke={2.5} /> Lägg till
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Fixed bottom bar ─────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div className="of-bar">
          <div className="of-bar-inner">
            <button className="of-bar-summary" onClick={() => setSheetOpen(true)} aria-label="Visa bokning">
              <span className="of-bar-count">{cartCount} {cartCount === 1 ? 'produkt' : 'produkter'}</span>
              <span className="of-bar-total">{grandTotalKr} kr <IconChevronUp size={15} stroke={2} /></span>
            </button>
            <button className="of-bar-cta" onClick={handleCheckout}>Gå till bokning →</button>
          </div>
        </div>
      )}

      {/* ── Bottom sheet: line-item list ─────────────────────────────────── */}
      {sheetOpen && cartCount > 0 && (
        <>
          <div className="of-sheet-scrim" onClick={() => setSheetOpen(false)} />
          <div className="of-sheet" role="dialog" aria-modal="true" aria-label="Din bokning">
            <div className="of-grabber" />
            <div className="of-sheet-head">
              <span className="of-sheet-title">Din bokning</span>
              <button className="of-sheet-close" onClick={() => setSheetOpen(false)} aria-label="Stäng">
                <IconX size={18} stroke={1.75} />
              </button>
            </div>
            <div className="of-sheet-body">
              {cart.map(item => (
                <div key={item.key} className="of-sheet-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="of-sheet-row-name">{item.name}</div>
                    {item.note && <div className="of-sheet-row-note">{item.note}</div>}
                    <div className="of-sheet-row-per">{item.price} kr / st</div>
                  </div>
                  <div className="prod-stepper">
                    <button className="prod-step-btn" aria-label={`Ta bort ${item.name}`} onClick={() => removeFromCart(item.key)}>
                      <IconMinus size={13} stroke={2.5} />
                    </button>
                    <PulseQty value={item.quantity} />
                    <button className="prod-step-btn" aria-label={`Lägg till ${item.name}`} onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, type: item.type, serviceId: item.serviceId, note: item.note })}>
                      <IconPlus size={13} stroke={2.5} />
                    </button>
                  </div>
                  <span className="of-sheet-line">{item.price * item.quantity} kr</span>
                </div>
              ))}

              <div style={{ paddingTop: 'var(--sp-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>Delsumma</span>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>{subtotalKr} kr</span>
                </div>
                {savingsKr > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <span className="small" style={{ color: 'var(--forest-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Rabatt
                      {isFirstTime && (
                        <span style={{ background: 'var(--forest-dark)', color: 'var(--moss)', borderRadius: 'var(--radius-pill)', padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>
                          Förstagångsrabatt
                        </span>
                      )}
                    </span>
                    <span className="small" style={{ color: 'var(--forest-dark)', fontWeight: 600 }}>−{savingsKr} kr</span>
                  </div>
                )}
                {rutDiscountKr > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <span className="small" style={{ color: 'var(--forest-dark)' }}>RUT-avdrag −{RUT_DISCOUNT_PERCENT}%</span>
                    <span className="small" style={{ color: 'var(--forest-dark)', fontWeight: 600 }}>−{rutDiscountKr} kr</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-md)' }}>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>Leverans</span>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>{deliveryFeeKr > 0 ? `${deliveryFeeKr} kr` : 'Gratis'}</span>
                </div>
                <div style={{ borderTop: '0.5px solid rgba(15,23,42,0.1)', paddingTop: 'var(--sp-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="small" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Totalt</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>{grandTotalKr} kr</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
