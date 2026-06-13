'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ChatNavLink from './ChatNavLink';

const NAV_LINKS = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/orders',   label: 'Orders' },
  { href: '/admin/customers',label: 'Customers' },
  { href: '/admin/calendar', label: 'Calendar' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/driver',   label: 'Driver' },
  { href: '/admin/settings', label: 'Inställningar' },
];

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Close when navigating
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div ref={ref} className="admin-mobile-nav">
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        padding: '0 1rem',
      }}>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', flex: 1 }}>
          Tvättio Admin
        </span>
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Stäng meny' : 'Öppna meny'}
          aria-expanded={open}
          style={{
            background: open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            color: '#fff',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '56px',
          left: 0,
          right: 0,
          background: '#1a1a1a',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100dvh - 56px)',
          overflowY: 'auto',
        }}>
          {NAV_LINKS.map(link => {
            const active = pathname === link.href ||
              (link.href !== '/admin' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: active ? '#fff' : '#ccc',
                  fontWeight: active ? 600 : 400,
                  background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                  textDecoration: 'none',
                  padding: '14px 1.25rem',
                  fontSize: '0.95rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'block',
                }}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Chat — uses the same component as the sidebar so unread count shows */}
          <div style={{ padding: '8px 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <ChatNavLink />
          </div>

          <div style={{ padding: '12px 1.25rem' }}>
            <form action="/api/admin/session" method="POST">
              <button
                formAction="/api/admin/logout"
                style={{
                  background: 'transparent',
                  border: '1px solid #444',
                  color: '#aaa',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
