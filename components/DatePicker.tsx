'use client';

import { useState, useEffect, useRef } from 'react';
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

const DAYS_SV   = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
const MONTHS_SV = [
  'Januari','Februari','Mars','April','Maj','Juni',
  'Juli','Augusti','September','Oktober','November','December',
];

function parseYMD(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(s: string): string {
  const d = parseYMD(s);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_SV[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Välj datum',
  minDate,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minDate?: string;
}) {
  const today = new Date();
  const todayYMD = toYMD(today);

  const [open, setOpen] = useState(false);
  const [viewYear,  setViewYear]  = useState(() => parseYMD(value)?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseYMD(value)?.getMonth()     ?? today.getMonth());

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Sync view when value set externally
  useEffect(() => {
    const d = parseYMD(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build day grid — week starts Monday
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // 0=Mon
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const minD = parseYMD(minDate ?? '');

  function selectDay(day: number) {
    const ymd = toYMD(new Date(viewYear, viewMonth, day));
    onChange(ymd);
    setOpen(false);
  }

  const btnBase: React.CSSProperties = {
    height: 34, width: '100%',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    background: 'transparent',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.1s',
  };

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
          {value ? formatDisplay(value) : placeholder}
        </span>
        <IconCalendar size={14} stroke={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }} />
      </button>

      {/* Calendar popup */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          zIndex: 100,
          background: 'var(--white)',
          border: '1px solid rgba(74,124,89,0.15)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(30,46,36,0.12)',
          padding: '16px',
          minWidth: '272px',
          width: '100%',
        }}>
          {/* Month / Year header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button
              type="button" onClick={prevMonth}
              style={{ width: 28, height: 28, borderRadius: 9999, border: '0.5px solid rgba(74,124,89,0.2)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)' }}
            >
              <IconChevronLeft size={13} stroke={1.5} />
            </button>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 500, color: 'var(--text-dark)' }}>
              {MONTHS_SV[viewMonth]} {viewYear}
            </span>
            <button
              type="button" onClick={nextMonth}
              style={{ width: 28, height: 28, borderRadius: 9999, border: '0.5px solid rgba(74,124,89,0.2)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)' }}
            >
              <IconChevronRight size={13} stroke={1.5} />
            </button>
          </div>

          {/* Day-of-week labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_SV.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', paddingBottom: 4 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const ymd        = toYMD(new Date(viewYear, viewMonth, day));
              const isSelected = ymd === value;
              const isToday    = ymd === todayYMD;
              const isDisabled = minD ? new Date(viewYear, viewMonth, day) < minD : false;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDay(day)}
                  style={{
                    ...btnBase,
                    border: isToday && !isSelected ? '1px solid var(--forest-mid)' : '1px solid transparent',
                    background: isSelected ? 'var(--forest-dark)' : 'transparent',
                    color: isSelected
                      ? 'var(--moss)'
                      : isDisabled
                        ? 'rgba(30,46,36,0.2)'
                        : 'var(--text-dark)',
                    fontWeight: isSelected || isToday ? 500 : 400,
                    cursor: isDisabled ? 'default' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected && !isDisabled)
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--linen)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected)
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '0.5px solid rgba(74,124,89,0.1)', marginTop: 12, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Rensa
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={() => { onChange(todayYMD); setOpen(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--forest-mid)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              Idag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
