'use client';

import { useState, useEffect, useRef } from 'react';
import { IconClock } from '@tabler/icons-react';

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const btnBase: React.CSSProperties = {
  height: 34,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  background: 'transparent',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.1s',
  width: '100%',
};

export default function TimePicker({
  value,
  onChange,
  placeholder = 'Välj tid',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selH = value.split(':')[0] ?? '';
  const selM = value.split(':')[1] ?? '';

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function pickHour(h: string) {
    onChange(selM ? `${h}:${selM}` : `${h}:00`);
  }

  function pickMinute(m: string) {
    onChange(selH ? `${selH}:${m}` : `08:${m}`);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input"
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left',
          color: value ? 'var(--text-dark)' : 'var(--text-muted)',
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15 }}>
          {value || placeholder}
        </span>
        <IconClock size={14} stroke={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }} />
      </button>

      {/* Popup */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          zIndex: 100,
          background: 'var(--white)',
          border: '1px solid rgba(74,124,89,0.15)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(30,46,36,0.12)',
          padding: '16px',
          minWidth: '200px',
          width: '100%',
        }}>
          {/* Hours */}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            Timme
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, marginBottom: 14 }}>
            {HOURS.map(h => {
              const isSel = h === selH;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => pickHour(h)}
                  style={{ ...btnBase, background: isSel ? 'var(--forest-dark)' : 'transparent', color: isSel ? 'var(--moss)' : 'var(--text-dark)', fontWeight: isSel ? 500 : 400 }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'var(--linen)'; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {h}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(74,124,89,0.1)', marginBottom: 14 }} />

          {/* Minutes */}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            Minut
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, marginBottom: 14 }}>
            {MINUTES.map(m => {
              const isSel = m === selM;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMinute(m)}
                  style={{ ...btnBase, background: isSel ? 'var(--forest-dark)' : 'transparent', color: isSel ? 'var(--moss)' : 'var(--text-dark)', fontWeight: isSel ? 500 : 400 }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'var(--linen)'; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '0.5px solid rgba(74,124,89,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--forest-mid)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              Klar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
