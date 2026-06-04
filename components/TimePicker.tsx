'use client';

import { useState, useEffect, useRef } from 'react';
import { IconClock } from '@tabler/icons-react';

const HOURS   = Array.from({ length: 11 }, (_, i) => String(i + 8).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function ScrollColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const ITEM_H = 36;

  // Scroll selected item into the middle on open / when selection changes
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollTop = idx * ITEM_H - ITEM_H * 2;
    }
  }, [selected, items]);

  return (
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: ITEM_H * 5,
        scrollbarWidth: 'none',
      }}
    >
      {items.map(v => {
        const isSel = v === selected;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: ITEM_H,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: isSel ? 'var(--forest-dark)' : 'transparent',
              color: isSel ? 'var(--moss)' : 'var(--text-dark)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              fontWeight: isSel ? 500 : 400,
              cursor: 'pointer',
              transition: 'background 0.1s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'var(--linen)';
            }}
            onMouseLeave={e => {
              if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

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

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function pickHour(h: string) { onChange(`${h}:${selM || '00'}`); }
  function pickMinute(m: string) { onChange(`${selH || '08'}:${m}`); }

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
          width: '100%',
          minWidth: '200px',
        }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {['Timme', 'Minut'].map(label => (
              <div key={label} style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 10,
                color: 'var(--text-muted)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Scrollable columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ScrollColumn items={HOURS}   selected={selH} onSelect={pickHour}   />
            <ScrollColumn items={MINUTES} selected={selM} onSelect={pickMinute} />
          </div>

          {/* Footer */}
          <div style={{ borderTop: '0.5px solid rgba(74,124,89,0.1)', marginTop: 12, paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
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
