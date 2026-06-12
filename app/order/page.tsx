'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconSteam, IconNeedle,
  IconShirt, IconHanger, IconStar, IconWash,
  IconScissors, IconDroplet, IconShield, IconBrush, IconWind, IconSparkles, IconTool,
  IconPlus, IconMinus, IconSpray, IconChevronUp, IconChevronRight,
  IconArrowLeft, IconX,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type StrukenCat   = 'Herr' | 'Dam' | 'Fest' | 'Hem' | 'Utomhus' | 'Skrädderi';
type StrukenProduct = { id: string; name: string; price: number; category: StrukenCat; order: number };
type Service      = { id: string; name: string; description: string; price_ore: number };
type CartItem     = { id: string; name: string; price: number; quantity: number; type: 'mattvätt' | 'struken' | 'service'; serviceId?: string };
type SectionId    = 'mattvätt' | 'struken' | 'kladavard';

// ── Constants ─────────────────────────────────────────────────────────────────

const STRUKEN_CATS: StrukenCat[] = ['Herr', 'Dam', 'Fest', 'Hem', 'Utomhus', 'Skrädderi'];

const SECTIONS: { id: SectionId; label: string; desc: string; Icon: React.ComponentType<{ size: number; stroke: number }>; subtitle: string }[] = [
  { id: 'mattvätt',  label: 'Mattvätt',      Icon: IconSpray,  desc: 'Djuptvätt av mattor',              subtitle: 'Djuptvätt av mattor · Hämtning & leverans ingår alltid' },
  { id: 'struken',   label: 'Struken tvätt', Icon: IconSteam,  desc: 'Skjortor, kostym & festklädsel',   subtitle: 'Skjortor, kostym & festklädsel — levereras hängda på galge' },
  { id: 'kladavard', label: 'Klädvård',      Icon: IconNeedle, desc: 'Lagning, ändring & rengöring',     subtitle: 'Lagning, ändring, rengöring & skydd för dina textilier' },
];

// Fixed mattvätt sizes (server re-validates these prices in create-cart-payment)
const MATT_OPTIONS: { id: string; name: string; price: number; Icon: React.ComponentType<{ size: number; stroke: number }> }[] = [
  { id: 'matta-liten', name: 'Matta liten (< 2 m²)', price: 299, Icon: IconSpray },
  { id: 'matta-stor',  name: 'Matta stor (> 2 m²)',  price: 499, Icon: IconSpray },
  { id: 'matta-akta',  name: 'Äkta / orientalisk',    price: 699, Icon: IconStar },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  const [strukenCatalog, setStrukenCatalog] = useState<Partial<Record<StrukenCat, StrukenProduct[]>>>({});
  const [services, setServices]       = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [sheetOpen, setSheetOpen]     = useState(false);

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

  // Close the sheet automatically if the cart empties out
  useEffect(() => { if (cartCount === 0 && sheetOpen) setSheetOpen(false); }, [cartCount, sheetOpen]);

  const openMeta = openSection ? SECTIONS.find(s => s.id === openSection)! : null;

  // A single product tile (mattvätt + struken + klädvård share the same shape)
  function ProductTile({ id, name, price, Icon, type, serviceId }: {
    id: string; name: string; price: number;
    Icon: React.ComponentType<{ size: number; stroke: number }>;
    type: CartItem['type']; serviceId?: string;
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
        onClick={() => addToCart({ id, name, price, type, serviceId })}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart({ id, name, price, type, serviceId }); } }}
      >
        <div className="prod-tile-icon"><Icon size={22} stroke={1.5} /></div>
        <div className="prod-tile-name">{name}</div>
        <div className="prod-tile-foot">
          <div className="prod-tile-price">{price} kr<span className="prod-tile-per">/st</span></div>
          {qty === 0 ? (
            <button className="of-add-btn" aria-label={`Lägg till ${name}`} onClick={e => { stop(e); addToCart({ id, name, price, type, serviceId }); }}>
              <IconPlus size={18} stroke={2.5} />
            </button>
          ) : (
            <div className="prod-stepper" onClick={stop}>
              <button className="prod-step-btn" aria-label={`Ta bort ${name}`} onClick={e => { stop(e); removeFromCart(id); }}>
                <IconMinus size={13} stroke={2.5} />
              </button>
              <PulseQty value={qty} />
              <button className="prod-step-btn" aria-label={`Lägg till ${name}`} onClick={e => { stop(e); addToCart({ id, name, price, type, serviceId }); }}>
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

          {/* Mattvätt — three fixed sizes */}
          {openSection === 'mattvätt' && (
            <div className="of-prod-grid">
              {MATT_OPTIONS.map(m => (
                <ProductTile key={m.id} id={m.id} name={m.name} price={m.price} Icon={m.Icon} type="mattvätt" />
              ))}
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
