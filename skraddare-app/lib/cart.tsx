import React, { createContext, useContext, useMemo, useState } from 'react';
import { type CartItem } from '../types';

// A single basket line. Mirrors the website cart item shape, plus the product's
// icon key so the checkout/summary can render the same glyph as the catalog.
export type CartLine = {
  id:    string;
  name:  string;
  price: number; // base kr (server re-validates)
  type:  CartItem['type'];
  qty:   number;
  icon?: string;
};

type CartMeta = Omit<CartLine, 'qty'>;

type CartContextValue = {
  lines:         CartLine[];
  qtyOf:         (id: string) => number;
  count:         number;
  add:           (item: CartMeta) => void;
  remove:        (id: string) => void;
  clear:         () => void;
  rutAvdrag:     boolean;
  setRutAvdrag:  (v: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

// Cart state lives above the tab navigator, so it survives tab switches (Hem →
// Chatt → Profil → Hem) and is cleared explicitly after a successful payment.
// It is intentionally in-memory only — a fresh app launch starts with an empty
// basket, which is the desired behaviour.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap]             = useState<Record<string, CartLine>>({});
  const [rutAvdrag, setRutAvdrag] = useState(false);

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.values(map);
    return {
      lines,
      qtyOf: (id: string) => map[id]?.qty ?? 0,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add: (item: CartMeta) =>
        setMap(prev => {
          const existing = prev[item.id];
          return { ...prev, [item.id]: { ...item, qty: (existing?.qty ?? 0) + 1 } };
        }),
      remove: (id: string) =>
        setMap(prev => {
          const existing = prev[id];
          if (!existing) return prev;
          if (existing.qty <= 1) {
            const next = { ...prev };
            delete next[id];
            return next;
          }
          return { ...prev, [id]: { ...existing, qty: existing.qty - 1 } };
        }),
      clear: () => { setMap({}); setRutAvdrag(false); },
      rutAvdrag,
      setRutAvdrag,
    };
  }, [map, rutAvdrag]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
