'use client';

import { useState, useEffect, useRef } from 'react';
import { IconClock } from '@tabler/icons-react';

export const TIME_SPANS = ['08-12', '12-16', '16-20'] as const;
export type TimeSpan = typeof TIME_SPANS[number];

export const SPAN_LABEL: Record<TimeSpan, string> = {
  '08-12': '08:00–12:00',
  '12-16': '12:00–16:00',
  '16-20': '16:00–20:00',
};

export default function TimePicker({
  value,
  onChange,
  placeholder = 'Välj tid',
  disabledOptions = [],
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabledOptions?: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const displayLabel = value
    ? (SPAN_LABEL[value as TimeSpan] ?? value)
    : placeholder;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
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
          {displayLabel}
        </span>
        <IconClock size={14} stroke={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          zIndex: 100,
          background: 'var(--white)',
          border: '1px solid rgba(74,124,89,0.15)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(30,46,36,0.12)',
          padding: '8px',
          width: '100%',
          minWidth: '180px',
        }}>
          {TIME_SPANS.map(span => {
            const disabled = disabledOptions.includes(span);
            const selected = value === span;
            return (
              <button
                key={span}
                type="button"
                disabled={disabled}
                onClick={() => { onChange(span); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: selected ? 'var(--forest-dark)' : 'transparent',
                  color: disabled ? 'var(--text-muted)' : selected ? 'var(--moss)' : 'var(--text-dark)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: selected ? 600 : 400,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.35 : 1,
                  marginBottom: 2,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!selected && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--linen)';
                }}
                onMouseLeave={e => {
                  if (!selected && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {SPAN_LABEL[span]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
