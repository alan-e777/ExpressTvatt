'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconShirt, IconHanger, IconStar, IconWash,
  IconMountain, IconNeedle, IconPlus, IconMinus,
} from '@tabler/icons-react';

type Category = 'Herr' | 'Dam' | 'Fest' | 'Hem' | 'Utomhus' | 'Skrädderi';
type Product  = { id: string; name: string; price: number; category: Category; order: number };

const CATEGORIES: Category[] = ['Herr', 'Dam', 'Fest', 'Hem', 'Utomhus', 'Skrädderi'];

const CAT_ICON: Record<Category, React.ComponentType<{ size: number; stroke: number }>> = {
  Herr:      IconShirt,
  Dam:       IconHanger,
  Fest:      IconStar,
  Hem:       IconWash,
  Utomhus:   IconMountain,
  Skrädderi: IconNeedle,
};

export default function StrukenTvattPage() {
  const router = useRouter();

  const [catalog, setCatalog]   = useState<Partial<Record<Category, Product[]>>>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [active, setActive]     = useState<Category>('Herr');
  const [basket, setBasket]     = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/struken-tvatt')
      .then(r => { if (!r.ok) throw new Error('Kunde inte hämta produkter.'); return r.json(); })
      .then((products: Product[]) => {
        const grouped: Partial<Record<Category, Product[]>> = {};
        for (const p of products) {
          if (!grouped[p.category]) grouped[p.category] = [];
          grouped[p.category]!.push(p);
        }
        setCatalog(grouped);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function add(id: string) { setBasket(p => ({ ...p, [id]: (p[id] ?? 0) + 1 })); }
  function rem(id: string) {
    setBasket(p => {
      const n = { ...p };
      if ((n[id] ?? 0) <= 1) delete n[id]; else n[id] -= 1;
      return n;
    });
  }

  const allProducts  = Object.values(catalog).flat() as Product[];
  const totalItems   = Object.values(basket).reduce((s, n) => s + n, 0);
  const totalPrice   = Object.entries(basket).reduce((s, [id, qty]) => {
    const p = allProducts.find(x => x.id === id);
    return s + (p?.price ?? 0) * qty;
  }, 0);

  function goToBooking() {
    if (totalItems === 0) return;
    const params = new URLSearchParams({ basket: JSON.stringify(basket) });
    router.push(`/struken-tvatt/boka?${params}`);
  }

  const products = catalog[active] ?? [];
  const Icon     = CAT_ICON[active];

  return (
    <div>
      {/* Category chips */}
      <div className="chips-row" style={{ marginBottom: 'var(--sp-lg)' }}>
        {CATEGORIES.map(cat => {
          const CatIcon = CAT_ICON[cat];
          return (
            <button
              key={cat}
              className={`chip ${active === cat ? 'active' : ''}`}
              onClick={() => setActive(cat)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <CatIcon size={12} stroke={1.5} />
              {cat}
            </button>
          );
        })}
      </div>

      {error && <p className="error-msg">{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0' }}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 9999 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="skeleton" style={{ width: '40%', height: 14 }} />
                <div className="skeleton" style={{ width: '20%', height: 10 }} />
              </div>
              <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 9999 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="section-label" style={{ marginBottom: 'var(--sp-sm)' }}>
            {products.length} plagg · {active}
          </div>

          <div style={{ marginBottom: totalItems > 0 ? 100 : 0 }}>
            {products.length === 0 ? (
              <p className="body" style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-xl)' }}>
                Inga produkter i denna kategori.
              </p>
            ) : (
              products.map((product, i) => {
                const qty     = basket[product.id] ?? 0;
                const isLast  = i === products.length - 1;
                return (
                  <div key={product.id} style={{
                    display:         'flex',
                    alignItems:      'center',
                    gap:             12,
                    padding:         '13px 0',
                    borderBottom:    isLast ? 'none' : '0.5px solid rgba(30,46,36,0.08)',
                  }}>
                    <div className="icon-circle">
                      <Icon size={16} stroke={1.5} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div className="body">{product.name}</div>
                      <div className="micro" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                        {product.price} kr / plagg
                      </div>
                    </div>

                    {qty === 0 ? (
                      <button onClick={() => add(product.id)} style={{
                        width: 32, height: 32, borderRadius: 9999,
                        border: '0.5px solid rgba(74,124,89,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--forest-mid)', background: 'none', cursor: 'pointer',
                      }}>
                        <IconPlus size={14} stroke={2} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => rem(product.id)} style={{
                          width: 30, height: 30, borderRadius: 9999,
                          border: '0.5px solid rgba(74,124,89,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--forest-mid)', background: 'none', cursor: 'pointer',
                        }}>
                          <IconMinus size={12} stroke={2.5} />
                        </button>
                        <span style={{
                          fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: 14,
                          color: 'var(--text-dark)', minWidth: 22, textAlign: 'center',
                        }}>
                          {qty}
                        </span>
                        <button onClick={() => add(product.id)} style={{
                          width: 30, height: 30, borderRadius: 9999,
                          border: '0.5px solid rgba(74,124,89,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--forest-mid)', background: 'none', cursor: 'pointer',
                        }}>
                          <IconPlus size={12} stroke={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Sticky basket bar */}
      {totalItems > 0 && (
        <div style={{
          position:   'fixed',
          bottom:     'var(--mobile-nav)',
          left:       '50%',
          transform:  'translateX(-50%)',
          width:      '100%',
          maxWidth:   'var(--content-max)',
          background: 'var(--forest-dark)',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding:    '14px 24px',
          zIndex:     150,
        }}>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(200,223,192,0.6)' }}>
              {totalItems} plagg
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--moss)' }}>
              {totalPrice} kr
            </div>
          </div>
          <button onClick={goToBooking} style={{
            background: 'var(--forest-light)',
            borderRadius: 'var(--radius-md)',
            padding: '11px 20px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--forest-dark)',
            border: 'none',
            cursor: 'pointer',
          }}>
            Välj datum & tid →
          </button>
        </div>
      )}

      {/* Desktop: basket sits at bottom-0 (no mobile nav offset) */}
      <style>{`
        @media (min-width: 768px) {
          .struken-basket { bottom: 0 !important; }
        }
      `}</style>
    </div>
  );
}
