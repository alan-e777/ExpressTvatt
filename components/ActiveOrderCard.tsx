'use client';

import { useEffect, useState } from 'react';
import { IconWashMachine } from '@tabler/icons-react';

type OrderStatus = 'pending_payment' | 'paid' | 'collected' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled';
export type ActiveOrder = { id: string; serviceName: string; status: OrderStatus; createdAt: Date };

const BADGE_LABEL: Partial<Record<OrderStatus, string>> = {
  paid:             'Väntar på hämtning',
  collected:        'Hos skräddaren',
  in_progress:      'Hos skräddaren',
  ready_for_pickup: 'Redo för leverans',
  completed:        'Levererad',
};
const STEPS = ['Bokad', 'Hämtad', 'Rengörs', 'Klar', 'Levererad'];

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

export default function ActiveOrderCard({ orders }: { orders: ActiveOrder[] }) {
  const [displayIdx, setDisplayIdx] = useState(0);
  const [animClass, setAnimClass]   = useState('');

  // Keep index in bounds if an order disappears
  useEffect(() => {
    setDisplayIdx(prev => Math.min(prev, Math.max(0, orders.length - 1)));
  }, [orders.length]);

  if (orders.length === 0) return null;

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
