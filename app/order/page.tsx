'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconSteam, IconNeedle, IconShirt, IconHanger, IconStar, IconWash,
  IconScissors, IconSpray, IconSparkles,
  IconPlus, IconMinus, IconChevronUp, IconChevronRight, IconArrowLeft, IconX, IconCheck,
} from '@tabler/icons-react';
import { rutNetKr, RUT_DISCOUNT_PERCENT } from '@/lib/rut';

// ── Types ─────────────────────────────────────────────────────────────────────

type CatId         = 'hushallstvatt' | 'hushallstvatt-rut' | 'mattvatt' | 'hem' | 'tvatt';
type StrukenProduct = { id: string; name: string; price: number; category: string; order: number };
type CartItem      = { id: string; name: string; price: number; quantity: number; type: 'mattvätt' | 'struken' | 'service'; serviceId?: string };

// ── Categories — mirrors eriksbergstvätten's five categories ────────────────────
// `dbCategory` is the value stored on each StrukenTvatt product (null = the
// category is rendered from a fixed local list rather than Firestore).
type CatMeta = {
  id: CatId;
  label: string;
  dbCategory: string | null;
  desc: string;
  subtitle: string;
  Icon: React.ComponentType<{ size: number; stroke: number }>;
};

const CATEGORIES: CatMeta[] = [
  { id: 'hushallstvatt',     label: 'Hushållstvätt',     dbCategory: 'Hushållstvätt',     Icon: IconWash,     desc: 'Tvätt per kilo & plagg',         subtitle: 'Tvätt per kilo och styckvis — hämtning & leverans ingår' },
  { id: 'hushallstvatt-rut', label: 'Hushållstvätt RUT', dbCategory: 'Hushållstvätt RUT', Icon: IconShirt,    desc: 'Hushållstvätt med RUT-avdrag',   subtitle: 'Hushållstvätt berättigad till RUT-avdrag' },
  { id: 'mattvatt',          label: 'Mattvätt',          dbCategory: null,                Icon: IconSpray,    desc: 'Djuptvätt av mattor',            subtitle: 'Djuptvätt av mattor — hämtning & leverans ingår alltid' },
  { id: 'hem',               label: 'Hem',               dbCategory: 'Hem',               Icon: IconSparkles, desc: 'Hemtextil & möbeltextil',        subtitle: 'Täcken, kuddar, gardiner, madrasser & möbeltextil' },
  { id: 'tvatt',             label: 'Tvätt',             dbCategory: 'Tvätt',             Icon: IconSteam,    desc: 'Kemtvätt & finare plagg',        subtitle: 'Kemtvätt av kostym, klänning, ytterplagg m.m.' },
];

// Fixed mattvätt sizes (server re-validates these prices in create-cart-payment)
const MATT_OPTIONS: { id: string; name: string; price: number; Icon: React.ComponentType<{ size: number; stroke: number }> }[] = [
  { id: 'matta-liten', name: 'Matta liten (< 2 m²)', price: 299, Icon: IconSpray },
  { id: 'matta-stor',  name: 'Matta stor (> 2 m²)',  price: 499, Icon: IconSpray },
  { id: 'matta-akta',  name: 'Äkta / orientalisk',    price: 699, Icon: IconStar },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function productIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('slips') || n.includes('halsduk') || n.includes('scarf') || n.includes('fluga')) return IconNeedle;
  if (n.includes('byxa') || n.includes('byxor') || n.includes('byxdress'))                         return IconScissors;
  if (n.includes('gardin') || n.includes('hängare'))                                               return IconHanger;
  if (n.includes('klänning') || n.includes('kjol') || n.includes('brud'))                          return IconStar;
  if (n.includes('matta') || n.includes('koskinn') || n.includes('fårskinn'))                      return IconSpray;
  return IconShirt;
}

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

// ── HomePage ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  const [strukenCatalog, setStrukenCatalog] = useState<Record<string, StrukenProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [openCat, setOpenCat]         = useState<CatId | null>(null);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [rutAvdrag, setRutAvdrag]     = useState(false);

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
  }, []);

  // Cart helpers
  function addToCart(item: Omit<CartItem, 'quantity'>) {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }
  function removeFromCart(id: string) {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }
  function cartQty(id: string) { return cart.find(i => i.id === id)?.quantity ?? 0; }

  function handleCheckout() {
    if (cart.length === 0) return;
    const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.quantity, type: i.type }));
    const rutParam = rutAvdrag ? '&rut=1' : '';
    router.push(`/kassa?cart=${encodeURIComponent(JSON.stringify(items))}${rutParam}`);
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Map every selectable product id → its category, for the per-category badges.
  const idToCat = useMemo(() => {
    const map: Record<string, CatId> = {};
    for (const m of MATT_OPTIONS) map[m.id] = 'mattvatt';
    for (const cat of CATEGORIES) {
      if (!cat.dbCategory) continue;
      for (const p of strukenCatalog[cat.dbCategory] ?? []) map[p.id] = cat.id;
    }
    return map;
  }, [strukenCatalog]);

  const countFor = (id: CatId) =>
    cart.filter(i => idToCat[i.id] === id).reduce((s, i) => s + i.quantity, 0);

  // Close the sheet automatically if the cart empties out
  useEffect(() => { if (cartCount === 0 && sheetOpen) setSheetOpen(false); }, [cartCount, sheetOpen]);

  const openMeta = openCat ? CATEGORIES.find(c => c.id === openCat)! : null;
  const openProducts = openMeta?.dbCategory ? (strukenCatalog[openMeta.dbCategory] ?? []) : [];

  // A single product tile (mattvätt + catalogue items share the same shape)
  function ProductTile({ id, name, price, Icon, type }: {
    id: string; name: string; price: number;
    Icon: React.ComponentType<{ size: number; stroke: number }>;
    type: CartItem['type'];
  }) {
    const qty = cartQty(id);
    const stop = (e: React.MouseEvent) => e.stopPropagation();
    return (
      <div
        className={`prod-tile${qty > 0 ? ' of-active' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`Lägg till ${name}`}
        style={{ cursor: 'pointer' }}
        onClick={() => addToCart({ id, name, price, type })}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart({ id, name, price, type }); } }}
      >
        <div className="prod-tile-icon"><Icon size={22} stroke={1.5} /></div>
        <div className="prod-tile-name">{name}</div>
        <div className="prod-tile-foot">
          <div className="prod-tile-price">
            {rutAvdrag ? (
              <>
                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontWeight: 500, marginRight: 5 }}>{price}</span>
                <span style={{ color: 'var(--forest-dark)' }}>{rutNetKr(price)} kr</span>
              </>
            ) : (
              <>{price} kr</>
            )}
            <span className="prod-tile-per">/st</span>
          </div>
          {qty === 0 ? (
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
            {CATEGORIES.map(({ id, label, desc, Icon }) => {
              const count = countFor(id);
              return (
                <button key={id} className="of-cat-row" onClick={() => setOpenCat(id)}>
                  <span className="of-cat-icon"><Icon size={20} stroke={1.5} /></span>
                  <span className="of-cat-text">
                    <span className="of-cat-title">{label}</span>
                    <span className="of-cat-desc" style={{ display: 'block' }}>{desc}</span>
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
              <div className="of-detail-title">{openMeta.label}</div>
              <div className="of-detail-sub">{openMeta.subtitle}</div>
            </div>
          </div>

          {/* Mattvätt — three fixed sizes */}
          {openMeta.id === 'mattvatt' && (
            <div className="of-prod-grid">
              {MATT_OPTIONS.map(m => (
                <ProductTile key={m.id} id={m.id} name={m.name} price={m.price} Icon={m.Icon} type="mattvätt" />
              ))}
            </div>
          )}

          {/* Catalogue-backed categories — product grid */}
          {openMeta.dbCategory && (
            loadingProducts ? <SkeletonRows count={6} /> : openProducts.length === 0 ? (
              <p className="small" style={{ color: 'var(--text-muted)', padding: 'var(--sp-md) 0' }}>Inga produkter tillgängliga just nu.</p>
            ) : (
              <div className="of-prod-grid">
                {openProducts.map(p => (
                  <ProductTile key={p.id} id={p.id} name={p.name} price={p.price} Icon={productIcon(p.name)} type="struken" />
                ))}
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
              <span className="of-bar-total">{cartTotal} kr <IconChevronUp size={15} stroke={2} /></span>
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
                <div key={item.id} className="of-sheet-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="of-sheet-row-name">{item.name}</div>
                    <div className="of-sheet-row-per">{item.price} kr / st</div>
                  </div>
                  <div className="prod-stepper">
                    <button className="prod-step-btn" aria-label={`Ta bort ${item.name}`} onClick={() => removeFromCart(item.id)}>
                      <IconMinus size={13} stroke={2.5} />
                    </button>
                    <PulseQty value={item.quantity} />
                    <button className="prod-step-btn" aria-label={`Lägg till ${item.name}`} onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, type: item.type, serviceId: item.serviceId })}>
                      <IconPlus size={13} stroke={2.5} />
                    </button>
                  </div>
                  <span className="of-sheet-line">{item.price * item.quantity} kr</span>
                </div>
              ))}

              <div style={{ paddingTop: 'var(--sp-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>Delsumma</span>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>{cartTotal} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-md)' }}>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>Hämtning &amp; leverans</span>
                  <span className="small" style={{ color: 'var(--text-mid)' }}>Ingår</span>
                </div>
                <div style={{ borderTop: '0.5px solid rgba(15,23,42,0.1)', paddingTop: 'var(--sp-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="small" style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Totalt</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)' }}>{cartTotal} kr</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
