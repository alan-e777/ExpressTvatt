'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  IconLeaf, IconWashMachine, IconSteam, IconNeedle,
  IconShirt, IconHanger, IconStar, IconWash, IconMountain,
  IconScissors, IconDroplet, IconShield, IconBrush, IconWind, IconSparkles, IconTool,
  IconPlus, IconMinus, IconSpray, IconInfoCircle, IconChevronUp, IconChevronDown,
} from '@tabler/icons-react';
import { auth, db } from '@/lib/firebase-client';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending_payment' | 'paid' | 'collected' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled';
type Order        = { id: string; serviceName: string; status: OrderStatus; createdAt: Date };
type StrukenCat   = 'Herr' | 'Dam' | 'Fest' | 'Hem' | 'Utomhus' | 'Skrädderi';
type StrukenProduct = { id: string; name: string; price: number; category: StrukenCat; order: number };
type Service      = { id: string; name: string; description: string; price_ore: number };
type CartItem     = { id: string; name: string; price: number; quantity: number; type: 'mattvätt' | 'struken' | 'service'; serviceId?: string };

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
const CAT_ICON: Record<StrukenCat, React.ComponentType<{ size: number; stroke: number }>> = {
  Herr:      IconShirt,
  Dam:       IconHanger,
  Fest:      IconStar,
  Hem:       IconWash,
  Utomhus:   IconMountain,
  Skrädderi: IconNeedle,
};

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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '0.5px solid rgba(30,46,36,0.08)' }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 9999, flexShrink: 0 }} />
          <div style={{ flex: 1 }}><div className="skeleton" style={{ width: '50%', height: 14 }} /></div>
          <div className="skeleton" style={{ width: 50, height: 14 }} />
        </div>
      ))}
    </div>
  );
}

// Inline [−] count [+] stepper used in all service rows
function QtyControl({ qty, onAdd, onRemove, price }: { qty: number; onAdd: () => void; onRemove: () => void; price: number }) {
  const btnStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 9999,
    border: '0.5px solid rgba(74,124,89,0.3)',
    background: 'none', color: 'var(--forest-mid)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-mid)', minWidth: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {qty > 0 ? `${price * qty} kr` : `${price} kr`}
      </span>
      <button
        onClick={onRemove}
        disabled={qty === 0}
        style={{ ...btnStyle, opacity: qty === 0 ? 0.4 : 1, cursor: qty === 0 ? 'default' : 'pointer' }}
      >
        <IconMinus size={11} stroke={2.5} />
      </button>
      <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-dark)', minWidth: 24, textAlign: 'center' }}>{qty}</span>
      <button onClick={onAdd} style={btnStyle}><IconPlus size={11} stroke={2.5} /></button>
    </div>
  );
}

// Cart sidebar panel
function CartPanel({ cart, onAdd, onRemove, onCheckout }: {
  cart: CartItem[];
  onAdd: (item: Omit<CartItem, 'quantity'>) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}) {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const isEmpty = cart.length === 0;

  return (
    <div style={{ background: 'var(--linen)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-xl)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-md)' }}>
        <IconWashMachine size={16} stroke={1.5} style={{ color: 'var(--forest-mid)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--text-dark)' }}>Din bokning</span>
      </div>

      {/* Item list */}
      {isEmpty ? (
        <p className="small" style={{ color: 'var(--text-muted)', lineHeight: '20px', marginBottom: 'var(--sp-lg)' }}>
          Välj tjänster till vänster så visas de här.
        </p>
      ) : (
        <div style={{ marginBottom: 'var(--sp-md)' }}>
          {cart.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 0', borderBottom: '0.5px solid rgba(30,46,36,0.08)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="body-bold" style={{ fontSize: 13 }}>{item.name}</div>
                <div className="micro">{item.price} kr / st</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => onRemove(item.id)}
                  style={{ width: 22, height: 22, borderRadius: 9999, border: '0.5px solid rgba(74,124,89,0.3)', background: 'none', color: 'var(--forest-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconMinus size={9} stroke={2.5} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-dark)', minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                <button
                  onClick={() => onAdd({ id: item.id, name: item.name, price: item.price, type: item.type, serviceId: item.serviceId })}
                  style={{ width: 22, height: 22, borderRadius: 9999, border: '0.5px solid rgba(74,124,89,0.3)', background: 'none', color: 'var(--forest-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconPlus size={9} stroke={2.5} />
                </button>
              </div>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, color: 'var(--text-mid)', minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                {item.price * item.quantity} kr
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Totals block — always visible */}
      <div style={{ marginBottom: 'var(--sp-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="small" style={{ color: 'var(--text-mid)' }}>Delsumma</span>
          <span className="small" style={{ color: 'var(--text-mid)' }}>{total} kr</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-md)' }}>
          <span className="small" style={{ color: 'var(--text-mid)' }}>Hämtning &amp; leverans</span>
          <span className="small" style={{ color: 'var(--text-mid)' }}>Ingår</span>
        </div>
        <div style={{ borderTop: '0.5px solid rgba(30,46,36,0.08)', paddingTop: 'var(--sp-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="small" style={{ fontWeight: 500, color: 'var(--text-dark)' }}>Totalt</span>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: 'var(--text-dark)' }}>{total} kr</span>
        </div>
      </div>

      {/* CTA */}
      <button
        className="btn-primary"
        onClick={onCheckout}
        disabled={isEmpty}
        style={{ width: '100%', maxWidth: '100%', ...(isEmpty ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
      >
        Gå vidare →
      </button>

      {/* Helper text */}
      <p className="micro" style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--sp-sm)' }}>
        Du anger uppgifter och datum i nästa steg.
      </p>
    </div>
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
  const [activeCat, setActiveCat]     = useState<StrukenCat>('Herr');
  const [mattKvm, setMattKvm]         = useState(5);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);

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
  function toggleSection(id: string) {
    setOpenSection(prev => prev === id ? null : id);
  }

  function handleCheckout() {
    if (cart.length === 0) return;
    const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.quantity, type: i.type }));
    router.push(`/kassa?cart=${encodeURIComponent(JSON.stringify(items))}`);
  }

  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const initials  = user?.displayName
    ? user.displayName.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2)
    : '?';

  const strukenProducts    = strukenCatalog[activeCat] ?? [];
  const ActiveCatIcon      = CAT_ICON[activeCat];
  const allStrukenProducts = STRUKEN_CATS.flatMap(cat => strukenCatalog[cat] ?? []);
  const cartTotal       = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount       = cart.reduce((s, i) => s + i.quantity, 0);

  // Mattvätt cart actions
  const mattId    = `matta-${mattKvm}`;
  const mattPrice = mattKvm * 90;

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 'var(--sp-md)', gap: 12,
  };

  return (
    <div className="home-grid">

      {/* ── Main column ───────────────────────────────────────────────── */}
      <div className="home-main">

        {/* Progress indicator */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-lg)' }}>
          <ol style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--forest-dark)', color: 'var(--white)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>1</span>
              <span style={{ color: 'var(--text-dark)', fontWeight: 500 }}>Välj tjänster</span>
            </li>
            <li style={{ color: 'var(--text-muted)', opacity: 0.4 }}>—</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--linen)', color: 'var(--text-mid)',
                border: '0.5px solid rgba(74,124,89,0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>2</span>
              <span style={{ color: 'var(--text-mid)' }}>Uppgifter &amp; datum</span>
            </li>
          </ol>
        </div>

        {/* Page heading */}
        <div className="greeting-card">
          <div className="h1">Vad vill du lämna in?</div>
          <p className="small" style={{ color: 'var(--text-mid)', marginTop: 8 }}>
            Välj tjänster nedan — mattvätt, struken tvätt och klädvård kan kombineras i samma bokning.
          </p>
          <div className="eco-trust-banner" style={{ marginTop: 'var(--sp-lg)', background: 'var(--cream)' }}>
            <IconLeaf size={12} stroke={1.5} />
            <span>Miljövänliga metoder sedan 1987</span>
          </div>
        </div>

        {/* Service toggle cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-md)', marginBottom: 'var(--sp-lg)' }}>
          {([
            { id: 'mattvätt',  label: 'Mattvätt',      Icon: IconSpray, desc: 'Djuptvätt av mattor' },
            { id: 'struken',   label: 'Struken tvätt', Icon: IconSteam, desc: 'Skjortor, kostym & festklädsel' },
            { id: 'kladavard', label: 'Klädvård',      Icon: IconNeedle, desc: 'Lagning, ändring & rengöring' },
          ] as const).map(({ id, label, Icon, desc }) => {
            const open = openSection === (id);
            return (
              <button
                key={id}
                onClick={() => toggleSection(id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 'var(--sp-md)',
                  padding: '28px 16px',
                  background: open ? 'var(--forest-dark)' : 'var(--white)',
                  borderRadius: 'var(--radius-lg)',
                  border: open ? '0.5px solid var(--forest-dark)' : '0.5px solid rgba(74,124,89,0.15)',
                  boxShadow: '0 1px 4px rgba(30,46,36,0.06)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  color: open ? 'var(--moss)' : 'var(--text-dark)',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: open ? 'rgba(200,223,192,0.15)' : 'var(--linen)',
                  border: open ? '0.5px solid rgba(200,223,192,0.25)' : '0.5px solid rgba(74,124,89,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  color: open ? 'var(--moss)' : 'var(--forest-mid)',
                }}>
                  <Icon size={18} stroke={1.5} />
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: open ? 'rgba(200,223,192,0.65)' : 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
              </button>
            );
          })}
        </div>

        {/* ── Mattvätt ───────────────────────────────────────────────── */}
        {openSection === ('mattvätt') && <div id="mattvätt" className="section service-card">
          <div style={sectionHeaderStyle}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div className="icon-circle" style={{ width: 28, height: 28 }}>
                  <IconSpray size={14} stroke={1.5} />
                </div>
                <div className="h3">Mattvätt</div>
              </div>
              <div className="small">Djuptvätt av mattor · Hämtning & leverans ingår alltid</div>
            </div>
          </div>

          <div style={{
            background: 'var(--cream)', borderRadius: 'var(--radius-lg)',
            padding: 'var(--sp-xl)', border: '0.5px solid rgba(74,124,89,0.1)',
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
                      fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 500,
                      color: 'var(--text-dark)', background: 'none', border: 'none',
                      borderBottom: '1.5px solid rgba(74,124,89,0.25)', outline: 'none',
                      width: 52, padding: '0 2px', lineHeight: 1,
                    }}
                  />
                  <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 500, color: 'var(--text-dark)' }}>m²</span>
                </div>
                {/* Custom stepper arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 }}>
                  <button
                    onClick={() => setMattKvm(v => Math.min(30, v + 1))}
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      border: '0.5px solid rgba(74,124,89,0.3)',
                      background: 'var(--cream)', color: 'var(--forest-mid)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--moss)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--cream)')}
                  >
                    <IconChevronUp size={13} stroke={2} />
                  </button>
                  <button
                    onClick={() => setMattKvm(v => Math.max(1, v - 1))}
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      border: '0.5px solid rgba(74,124,89,0.3)',
                      background: 'var(--cream)', color: 'var(--forest-mid)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--moss)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--cream)')}
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
              style={{ width: '100%', accentColor: 'var(--forest-dark)', marginBottom: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-lg)' }}>
              <span className="micro">1 m²</span>
              <span className="micro">30 m²</span>
            </div>

            {/* Price row */}
            <div style={{ marginBottom: 'var(--sp-md)' }}>
              <div className="micro" style={{ marginBottom: 2, letterSpacing: '1px', textTransform: 'uppercase' }}>Pris</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 29, color: 'var(--text-dark)' }}>
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
                <button onClick={() => removeFromCart(mattId)} style={{ width: 34, height: 34, borderRadius: 9999, border: '0.5px solid rgba(74,124,89,0.3)', background: 'none', color: 'var(--forest-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconMinus size={13} stroke={2.5} />
                </button>
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-dark)', minWidth: 20, textAlign: 'center' }}>{cartQty(mattId)}</span>
                <button onClick={() => addToCart({ id: mattId, name: `Matta ${mattKvm} m²`, price: mattPrice, type: 'mattvätt' })} style={{ width: 34, height: 34, borderRadius: 9999, border: '0.5px solid rgba(74,124,89,0.3)', background: 'none', color: 'var(--forest-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPlus size={13} stroke={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>}

        {/* ── Struken tvätt ─────────────────────────────────────────── */}
        {openSection === ('struken') && <div id="struken" className="section service-card">
          <div style={sectionHeaderStyle}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div className="icon-circle" style={{ width: 28, height: 28 }}>
                  <IconSteam size={14} stroke={1.5} />
                </div>
                <div className="h3">Struken tvätt</div>
              </div>
              <div className="small">Skjortor, kostym & festklädsel — levereras hängda på galge</div>
            </div>
          </div>

          {loadingServices ? <SkeletonRows count={6} /> : allStrukenProducts.length === 0 ? (
            <p className="small" style={{ color: 'var(--text-muted)', padding: 'var(--sp-md) 0' }}>Inga plagg tillgängliga just nu.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {allStrukenProducts.map((p, i) => {
                const Icon = strukenIcon(p.name);
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                    borderBottom: i < allStrukenProducts.length - 1 ? '0.5px solid rgba(30,46,36,0.08)' : 'none',
                  }}>
                    <div className="icon-circle"><Icon size={16} stroke={1.5} /></div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div className="body" style={{ overflowWrap: 'break-word', minWidth: 0 }}>{p.name}</div>
                      <button
                        title="Mer information tillkommer."
                        aria-label={`Mer information om ${p.name}`}
                        style={{ width: 18, height: 18, borderRadius: '50%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--forest-mid)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <IconInfoCircle size={13} stroke={1.5} />
                      </button>
                    </div>
                    <QtyControl
                      qty={cartQty(p.id)}
                      price={p.price}
                      onAdd={() => addToCart({ id: p.id, name: p.name, price: p.price, type: 'struken' })}
                      onRemove={() => removeFromCart(p.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        {/* ── Klädvård & textil ─────────────────────────────────────── */}
        {openSection === ('kladavard') && <div id="kladavard" className="section service-card">
          <div style={sectionHeaderStyle}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div className="icon-circle" style={{ width: 28, height: 28 }}>
                  <IconNeedle size={14} stroke={1.5} />
                </div>
                <div className="h3">Klädvård & textil</div>
              </div>
              <div className="small">Lagning, ändring, rengöring & skydd för dina textilier</div>
            </div>
          </div>

          {loadingServices ? <SkeletonRows count={5} /> : services.length === 0 ? (
            <p className="small" style={{ color: 'var(--text-muted)', padding: 'var(--sp-md) 0' }}>Inga tjänster tillgängliga just nu.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {services.map((svc, i) => {
                const Icon  = serviceIcon(svc.name);
                const price = svc.price_ore / 100;
                return (
                  <div key={svc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                    borderBottom: i < services.length - 1 ? '0.5px solid rgba(30,46,36,0.08)' : 'none',
                  }}>
                    <div className="icon-circle"><Icon size={16} stroke={1.5} /></div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div className="body" style={{ overflowWrap: 'break-word', minWidth: 0 }}>{svc.name}</div>
                      <button
                        title="Mer information tillkommer."
                        aria-label={`Mer information om ${svc.name}`}
                        style={{ width: 18, height: 18, borderRadius: '50%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--forest-mid)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <IconInfoCircle size={13} stroke={1.5} />
                      </button>
                    </div>
                    <QtyControl
                      qty={cartQty(svc.id)}
                      price={price}
                      onAdd={() => addToCart({ id: svc.id, name: svc.name, price, type: 'service', serviceId: svc.id })}
                      onRemove={() => removeFromCart(svc.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>}
      </div>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <div className="home-sidebar">
        <CartPanel
          cart={cart}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onCheckout={handleCheckout}
        />

        {activeOrders.length > 0 && (
          <div style={{ marginTop: 'var(--sp-xl)' }}>
            <ActiveOrderCard orders={activeOrders} />
          </div>
        )}
      </div>

      {/* ── Mobile sticky cart bar ────────────────────────────────────── */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 'var(--mobile-nav)', left: '50%',
          transform: 'translateX(-50%)', width: '100%',
          maxWidth: 'var(--content-max)',
          background: 'var(--forest-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', zIndex: 150,
        }}
          className="mobile-cart-bar"
        >
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(200,223,192,0.6)' }}>
              {cartCount} {cartCount === 1 ? 'produkt' : 'produkter'}
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--moss)' }}>
              {cartTotal} kr
            </div>
          </div>
          <button onClick={handleCheckout} style={{
            background: 'var(--forest-light)', borderRadius: 'var(--radius-md)',
            padding: '11px 20px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            fontSize: 13, color: 'var(--forest-dark)', border: 'none', cursor: 'pointer',
          }}>
            Gå till bokning →
          </button>
        </div>
      )}

      {/* Hide mobile cart bar on desktop */}
      <style>{`.mobile-cart-bar { display: flex; } @media (min-width: 768px) { .mobile-cart-bar { display: none !important; } }`}</style>

    </div>
  );
}
