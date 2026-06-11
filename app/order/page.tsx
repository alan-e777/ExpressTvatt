'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  IconWashMachine, IconSteam, IconNeedle,
  IconShirt, IconHanger, IconStar, IconWash,
  IconScissors, IconDroplet, IconShield, IconBrush, IconWind, IconSparkles, IconTool,
  IconPlus, IconMinus, IconSpray, IconChevronUp, IconChevronDown, IconChevronRight,
  IconArrowLeft, IconX,
} from '@tabler/icons-react';
import { auth, db } from '@/lib/firebase-client';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending_payment' | 'paid' | 'collected' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled';
type Order        = { id: string; serviceName: string; status: OrderStatus; createdAt: Date };
type StrukenCat   = 'Herr' | 'Dam' | 'Fest' | 'Hem' | 'Utomhus' | 'Skrädderi';
type StrukenProduct = { id: string; name: string; price: number; category: StrukenCat; order: number };
type Service      = { id: string; name: string; description: string; price_ore: number };
type CartItem     = { id: string; name: string; price: number; quantity: number; type: 'mattvätt' | 'struken' | 'service'; serviceId?: string };
type SectionId    = 'mattvätt' | 'struken' | 'kladavard';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['paid', 'collected', 'in_progress', 'ready_for_pickup'];
const BADGE_LABEL: Partial<Record<OrderStatus, string>> = {
  paid:             'Väntar på hämtning',
  collected:        'Hos skräddaren',
  in_progress:      'Hos skräddaren',
  ready_for_pickup: 'Redo för leverans',
  completed:        'Levererad',
};
const STEPS = ['Bokad', 'Hämtad', 'Rengörs', 'Klar', 'Levererad'];

const STRUKEN_CATS: StrukenCat[] = ['Herr', 'Dam', 'Fest', 'Hem', 'Utomhus', 'Skrädderi'];

const SECTIONS: { id: SectionId; label: string; desc: string; Icon: React.ComponentType<{ size: number; stroke: number }>; subtitle: string }[] = [
  { id: 'mattvätt',  label: 'Mattvätt',      Icon: IconSpray,  desc: 'Djuptvätt av mattor',              subtitle: 'Djuptvätt av mattor · Hämtning & leverans ingår alltid' },
  { id: 'struken',   label: 'Struken tvätt', Icon: IconSteam,  desc: 'Skjortor, kostym & festklädsel',   subtitle: 'Skjortor, kostym & festklädsel — levereras hängda på galge' },
  { id: 'kladavard', label: 'Klädvård',      Icon: IconNeedle, desc: 'Lagning, ändring & rengöring',     subtitle: 'Lagning, ändring, rengöring & skydd för dina textilier' },
];

const MATT_LABELS: Record<number, string> = {
  1:'1×1 m', 2:'1×2 m', 3:'1.5×2 m', 4:'2×2 m', 5:'2×2.5 m',
  6:'2×3 m', 8:'2.5×3 m', 10:'2.5×4 m', 12:'3×4 m', 15:'3×5 m',
  20:'4×5 m', 24:'4×6 m', 25:'5×5 m', 30:'5×6 m',
};
function mattLabel(v: number) {
  const keys = Object.keys(MATT_LABELS).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) { if (Math.abs(k - v) < Math.abs(best - v)) best = k; }
  return MATT_LABELS[best] ?? `${v} m²`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateFor(s: OrderStatus): ('done' | 'active' | 'future')[] {
  switch (s) {
    case 'paid':             return ['active', 'future', 'future', 'future', 'future'];
    case 'collected':        return ['done',   'active', 'future', 'future', 'future'];
    case 'in_progress':      return ['done',   'done',   'active', 'future', 'future'];
    case 'ready_for_pickup': return ['done',   'done',   'done',   'active', 'future'];
    case 'completed':        return ['done',   'done',   'done',   'done',   'active'];
    default:                 return ['active', 'future', 'future', 'future', 'future'];
  }
}

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('gardin') || n.includes('hängare'))                             return IconHanger;
  if (n.includes('plagg') || n.includes('tork'))                                 return IconWash;
  if (n.includes('fläck') || n.includes('vatten'))                               return IconDroplet;
  if (n.includes('skydd') || n.includes('impregnering') || n.includes('mott'))  return IconShield;
  if (n.includes('polstring') || n.includes('möbel'))                            return IconBrush;
  if (n.includes('press') || n.includes('stryk'))                                return IconWind;
  if (n.includes('doft'))                                                         return IconSparkles;
  if (n.includes('tät') || n.includes('matta') || n.includes('djup'))           return IconSpray;
  if (n.includes('reng'))                                                         return IconBrush;
  if (n.includes('lagning') || n.includes('reparation') || n.includes('skada')) return IconTool;
  if (n.includes('ändring') || n.includes('söm'))                                return IconNeedle;
  return IconScissors;
}

function strukenIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('slips') || n.includes('halsduk') || n.includes('sjal'))       return IconNeedle;
  if (n.includes('byxor') || n.includes('jeans') || n.includes('chino'))        return IconScissors;
  if (n.includes('gardin') || n.includes('hängare'))                             return IconHanger;
  if (n.includes('klänning') || n.includes('kjol'))                              return IconStar;
  return IconShirt;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActiveOrderCard({ orders }: { orders: Order[] }) {
  const [displayIdx, setDisplayIdx] = useState(0);
  const [animClass, setAnimClass]   = useState('');

  // Keep index in bounds if an order disappears
  useEffect(() => {
    setDisplayIdx(prev => Math.min(prev, Math.max(0, orders.length - 1)));
  }, [orders.length]);

  const order  = orders[displayIdx];
  const extra  = orders.length - 1;
  const states = stateFor(order.status);
  const badge  = BADGE_LABEL[order.status] ?? 'Pågår';

  function handleClick() {
    if (orders.length <= 1) return;
    setAnimClass('card-swap-exit');
    setTimeout(() => {
      setDisplayIdx(i => (i + 1) % orders.length);
      setAnimClass('card-swap-enter');
    }, 200);
  }

  return (
    <div style={{ position: 'relative' }}>

      {/* +X notification bubble */}
      {extra > 0 && (
        <div style={{
          position: 'absolute', top: -8, right: -8, zIndex: 1,
          minWidth: 22, height: 22, borderRadius: 9999,
          padding: '0 5px',
          background: 'var(--forest-light)', color: 'var(--forest-dark)',
          fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          +{extra}
        </div>
      )}

      <div
        className="active-order-card section"
        data-status={order.status}
        style={{ cursor: orders.length > 1 ? 'pointer' : 'default', overflow: 'hidden' }}
        onClick={handleClick}
      >
        <div className={animClass} onAnimationEnd={() => setAnimClass('')}>
          <div className="section-label">PÅGÅENDE RENGÖRINGAR</div>
          <div className="order-row">
            <div className="order-icon"><IconWashMachine size={16} stroke={1.5} /></div>
            <div style={{ flex: 1 }}>
              <div className="order-name">{order.serviceName}</div>
              <div className="order-id">#{order.id.slice(-7).toUpperCase()}</div>
            </div>
            <div className="order-badge">{badge}</div>
          </div>
          <div className="stepper">
            <div className="nodes-row">
              {STEPS.map((_, i) => {
                const s = states[i];
                const circle = (
                  <div className={`step-circle step-${s}`}>
                    {s === 'done' ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#fafaf7' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="step-num" style={{ color: s === 'active' ? '#2d5a3d' : 'rgba(200,223,192,0.35)' }}>{i + 1}</span>
                    )}
                  </div>
                );
                return (
                  <div key={i} style={{ display: 'contents' }}>
                    {i > 0 && <div className={`connector ${states[i-1] === 'done' ? 'connector-done' : 'connector-future'}`} />}
                    <div className="node-wrap">
                      {s === 'active' ? <div className="active-ring">{circle}</div> : circle}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="labels-row">
              {STEPS.map((label, i) => (
                <div key={label} style={{ display: 'contents' }}>
                  {i > 0 && <div className="label-gap" />}
                  <span className={`step-label step-label-${states[i]}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

  const [user, setUser]               = useState<User | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [strukenCatalog, setStrukenCatalog] = useState<Partial<Record<StrukenCat, StrukenProduct[]>>>({});
  const [services, setServices]       = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [mattKvm, setMattKvm]         = useState(5);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [sheetOpen, setSheetOpen]     = useState(false);

  // Auth + live order
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (!currentUser) { setActiveOrders([]); return; }
      const q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
      const unsubOrders = onSnapshot(q, snap => {
        const all = snap.docs.map(d => {
          const data = d.data();
          return { id: d.id, serviceName: data.serviceName, status: data.status as OrderStatus,
                   createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date() };
        });
        // newest → oldest; cycle order matches "latest first"
        const active = all.filter(o => ACTIVE_STATUSES.includes(o.status))
                          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActiveOrders(active);
      });
      return unsubOrders;
    });
    return unsubAuth;
  }, []);

  // Fetch services
  useEffect(() => {
    Promise.all([
      fetch('/api/struken-tvatt').then(r => r.json() as Promise<StrukenProduct[]>),
      fetch('/api/services').then(r => r.json() as Promise<Service[]>),
    ]).then(([products, svcs]) => {
      const grouped: Partial<Record<StrukenCat, StrukenProduct[]>> = {};
      for (const p of products) {
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category]!.push(p);
      }
      for (const cat of STRUKEN_CATS) grouped[cat]?.sort((a, b) => a.order - b.order);
      setStrukenCatalog(grouped);
      setServices(svcs);
    }).finally(() => setLoadingServices(false));
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
    router.push(`/kassa?cart=${encodeURIComponent(JSON.stringify(items))}`);
  }

  const allStrukenProducts = STRUKEN_CATS.flatMap(cat => strukenCatalog[cat] ?? []);
  const cartTotal       = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount       = cart.reduce((s, i) => s + i.quantity, 0);

  // Per-category counts for the row badges
  const countFor = (id: SectionId) => {
    const type = id === 'kladavard' ? 'service' : id;
    return cart.filter(i => i.type === type).reduce((s, i) => s + i.quantity, 0);
  };

  // Mattvätt cart actions
  const mattId    = `matta-${mattKvm}`;
  const mattPrice = mattKvm * 90;

  // Close the sheet automatically if the cart empties out
  useEffect(() => { if (cartCount === 0 && sheetOpen) setSheetOpen(false); }, [cartCount, sheetOpen]);

  const openMeta = openSection ? SECTIONS.find(s => s.id === openSection)! : null;

  // A single product tile (struken + klädvård share the same shape)
  function ProductTile({ id, name, price, Icon, type, serviceId }: {
    id: string; name: string; price: number;
    Icon: React.ComponentType<{ size: number; stroke: number }>;
    type: 'struken' | 'service'; serviceId?: string;
  }) {
    const qty = cartQty(id);
    return (
      <div className={`prod-tile${qty > 0 ? ' of-active' : ''}`}>
        <div className="prod-tile-icon"><Icon size={22} stroke={1.5} /></div>
        <div className="prod-tile-name">{name}</div>
        <div className="prod-tile-foot">
          <div className="prod-tile-price">{price} kr<span className="prod-tile-per">/st</span></div>
          {qty === 0 ? (
            <button className="of-add-btn" aria-label={`Lägg till ${name}`} onClick={() => addToCart({ id, name, price, type, serviceId })}>
              <IconPlus size={18} stroke={2.5} />
            </button>
          ) : (
            <div className="prod-stepper">
              <button className="prod-step-btn" aria-label={`Ta bort ${name}`} onClick={() => removeFromCart(id)}>
                <IconMinus size={13} stroke={2.5} />
              </button>
              <PulseQty value={qty} />
              <button className="prod-step-btn" aria-label={`Lägg till ${name}`} onClick={() => addToCart({ id, name, price, type, serviceId })}>
                <IconPlus size={13} stroke={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`of-flow${cartCount > 0 ? ' has-bar' : ''}`}>

      {activeOrders.length > 0 && (
        <div style={{ marginBottom: 'var(--sp-xl)' }}>
          <ActiveOrderCard orders={activeOrders} />
        </div>
      )}

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

      {/* ── List view: category rows ─────────────────────────────────────── */}
      {openSection === null && (
        <div className="service-card" id="services">
          <div className="of-cat-list">
            {SECTIONS.map(({ id, label, desc, Icon }) => {
              const count = countFor(id);
              return (
                <button key={id} className="of-cat-row" onClick={() => setOpenSection(id)}>
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
          <button className="of-back" onClick={() => setOpenSection(null)}>
            <IconArrowLeft size={16} stroke={1.75} /> Tillbaka
          </button>
          <div className="of-detail-head">
            <span className="icon-circle" style={{ width: 36, height: 36 }}><openMeta.Icon size={16} stroke={1.5} /></span>
            <div>
              <div className="of-detail-title">{openMeta.label}</div>
              <div className="of-detail-sub">{openMeta.subtitle}</div>
            </div>
          </div>

          {/* Mattvätt — size slider */}
          {openSection === 'mattvätt' && (
            <div style={{
              background: 'var(--linen)', borderRadius: 'var(--radius-lg)',
              padding: 'var(--sp-xl)', border: '0.5px solid rgba(14,92,91,0.1)',
            }}>
              <div className="small" style={{ marginBottom: 'var(--sp-md)', color: 'var(--text-mid)' }}>
                Välj storlek på mattan
              </div>

              {/* kvm display — editable */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <input
                      type="number" min={1} max={30} step={1} value={mattKvm}
                      onChange={e => {
                        const v = Math.min(30, Math.max(1, Number(e.target.value)));
                        if (!isNaN(v) && e.target.value !== '') setMattKvm(Math.round(v));
                      }}
                      className="matt-kvm-input"
                      style={{
                        fontFamily: 'inherit', fontSize: 36, fontWeight: 600,
                        color: 'var(--text-dark)', background: 'none', border: 'none',
                        borderBottom: '1.5px solid rgba(14,92,91,0.25)', outline: 'none',
                        width: 52, padding: '0 2px', lineHeight: 1,
                      }}
                    />
                    <span style={{ fontSize: 36, fontWeight: 600, color: 'var(--text-dark)' }}>m²</span>
                  </div>
                  {/* Custom stepper arrows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 }}>
                    <button
                      onClick={() => setMattKvm(v => Math.min(30, v + 1))}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        border: '0.5px solid rgba(14,92,91,0.2)',
                        background: 'var(--linen)', color: 'var(--forest-mid)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                    >
                      <IconChevronUp size={13} stroke={2} />
                    </button>
                    <button
                      onClick={() => setMattKvm(v => Math.max(1, v - 1))}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        border: '0.5px solid rgba(14,92,91,0.2)',
                        background: 'var(--linen)', color: 'var(--forest-mid)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                    >
                      <IconChevronDown size={13} stroke={2} />
                    </button>
                  </div>
                </div>
                <span className="small">{mattLabel(mattKvm)}</span>
              </div>

              {/* Slider */}
              <input
                type="range" min={1} max={30} step={1} value={mattKvm}
                onChange={e => setMattKvm(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--forest-mid)', marginBottom: 4 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-lg)' }}>
                <span className="micro">1 m²</span>
                <span className="micro">30 m²</span>
              </div>

              {/* Price row */}
              <div style={{ marginBottom: 'var(--sp-md)' }}>
                <div className="micro" style={{ marginBottom: 2, letterSpacing: '1px', textTransform: 'uppercase' }}>Pris</div>
                <div style={{ fontSize: 29, fontWeight: 600, color: 'var(--text-dark)' }}>
                  {mattPrice} kr
                </div>
                <div className="micro">90 kr / m²</div>
              </div>

              {/* CTA — full-width below */}
              {cartQty(mattId) === 0 ? (
                <button
                  onClick={() => addToCart({ id: mattId, name: `Matta ${mattKvm} m²`, price: mattPrice, type: 'mattvätt' })}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Lägg till matta ({mattKvm} m²) — {mattPrice} kr
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => removeFromCart(mattId)} style={{ width: 34, height: 34, borderRadius: 9999, border: '0.5px solid rgba(14,92,91,0.25)', background: 'none', color: 'var(--forest-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconMinus size={13} stroke={2.5} />
                  </button>
                  <PulseQty value={cartQty(mattId)} />
                  <button onClick={() => addToCart({ id: mattId, name: `Matta ${mattKvm} m²`, price: mattPrice, type: 'mattvätt' })} style={{ width: 34, height: 34, borderRadius: 9999, border: '0.5px solid rgba(14,92,91,0.25)', background: 'none', color: 'var(--forest-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconPlus size={13} stroke={2.5} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Struken tvätt — product grid */}
          {openSection === 'struken' && (
            loadingServices ? <SkeletonRows count={6} /> : allStrukenProducts.length === 0 ? (
              <p className="small" style={{ color: 'var(--text-muted)', padding: 'var(--sp-md) 0' }}>Inga plagg tillgängliga just nu.</p>
            ) : (
              <div className="of-prod-grid">
                {allStrukenProducts.map(p => (
                  <ProductTile key={p.id} id={p.id} name={p.name} price={p.price} Icon={strukenIcon(p.name)} type="struken" />
                ))}
              </div>
            )
          )}

          {/* Klädvård & textil — product grid */}
          {openSection === 'kladavard' && (
            loadingServices ? <SkeletonRows count={5} /> : services.length === 0 ? (
              <p className="small" style={{ color: 'var(--text-muted)', padding: 'var(--sp-md) 0' }}>Inga tjänster tillgängliga just nu.</p>
            ) : (
              <div className="of-prod-grid">
                {services.map(svc => (
                  <ProductTile key={svc.id} id={svc.id} name={svc.name} price={svc.price_ore / 100} Icon={serviceIcon(svc.name)} type="service" serviceId={svc.id} />
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
