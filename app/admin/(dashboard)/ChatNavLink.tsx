'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, realtimeDb } from '@/lib/firebase-client';
import { ensureAdminFirebaseAuth } from '@/lib/admin-firebase-signin';

const STORAGE_KEY = 'adminChatLastRead';

export default function ChatNavLink() {
  const pathname = usePathname();
  const active   = pathname === '/admin/chat';
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let unsubDb: (() => void) | null = null;
    let listening = false;

    function startListening() {
      if (listening) return;
      listening = true;
      unsubDb = onValue(ref(realtimeDb, 'chats'), snap => {
        const lastRead = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
        let count = 0;
        snap.forEach(child => {
          const lastAt = child.val()?.lastAt ?? 0;
          if (lastAt > lastRead) count++;
        });
        setUnread(count);
      });
    }

    // Being signed in is not sufficient — the rules require the `admin` claim,
    // which an email/password login does not carry. This component runs on every
    // dashboard page, so it is what gets the claim in place for the live
    // Firestore listeners elsewhere (notably the Orders table).
    const unsubAuth = onAuthStateChanged(auth, user => {
      ensureAdminFirebaseAuth(user)
        .then(startListening)
        .catch(() => {});
    });

    return () => {
      unsubAuth();
      unsubDb?.();
    };
  }, []);

  // Mark all read when on the chat page
  useEffect(() => {
    if (active) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setUnread(0);
    }
  }, [active]);

  return (
    <Link href="/admin/chat" style={{
      color: '#ccc',
      textDecoration: 'none',
      padding: '0.5rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.9rem',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      Chat
      {unread > 0 && (
        <span style={{
          background: '#dc2626',
          color: '#fff',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 700,
          padding: '1px 6px',
          lineHeight: '16px',
          minWidth: '18px',
          textAlign: 'center',
        }}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
