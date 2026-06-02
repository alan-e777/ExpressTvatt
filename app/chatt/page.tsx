'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconArrowUp, IconLock } from '@tabler/icons-react';
import { ref, onValue, query, orderByChild, update } from 'firebase/database';
import { type User } from 'firebase/auth';
import { auth, realtimeDb } from '@/lib/firebase-client';

type Message = { id: string; text: string; from: 'customer' | 'admin'; timestamp: number };

const PREVIEW_MESSAGES = [
  { id: '1', text: 'Hej! Hur kan jag hjälpa dig?',                            from: 'admin'    as const, timestamp: 0 },
  { id: '2', text: 'Hej! Jag undrar om lagning av en jacka.',                  from: 'customer' as const, timestamp: 0 },
  { id: '3', text: 'Självklart, berätta gärna mer om vad som behöver lagas.', from: 'admin'    as const, timestamp: 0 },
];

export default function ChattPage() {
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'loggedIn'>('loading');
  const [user, setUser]           = useState<User | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      setAuthState(u ? 'loggedIn' : 'guest');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const msgQuery = query(
      ref(realtimeDb, `chats/${user.uid}/messages`),
      orderByChild('timestamp'),
    );
    const unsub = onValue(msgQuery, snap => {
      const msgs: Message[] = [];
      snap.forEach(child => msgs.push({ id: child.key!, ...child.val() }));
      setMessages(msgs);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !user) return;
    setInput('');

    const msgKey = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await update(ref(realtimeDb), {
      [`chats/${user.uid}/messages/${msgKey}`]: { text, from: 'customer', timestamp: Date.now() },
      [`chats/${user.uid}/customerName`]:  user.displayName ?? 'Kund',
      [`chats/${user.uid}/customerEmail`]: user.email ?? '',
      [`chats/${user.uid}/lastMessage`]:   text,
      [`chats/${user.uid}/lastAt`]:        Date.now(),
      [`chats/${user.uid}/uid`]:           user.uid,
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const displayMessages = authState === 'loggedIn' ? messages : PREVIEW_MESSAGES;

  return (
    <div className="chat-shell">
      <div className="chat-list">
        {displayMessages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column',
            alignItems: msg.from === 'customer' ? 'flex-end' : 'flex-start' }}>
            <div className={`bubble ${msg.from === 'customer' ? 'bubble-right' : 'bubble-left'}`}>
              <p className={msg.from === 'customer' ? 'bubble-text-right' : 'body'}
                style={{ lineHeight: '21px' }}>
                {msg.text}
              </p>
              {msg.timestamp > 0 && (
                <p className={`bubble-time ${msg.from === 'customer' ? 'time-right' : 'time-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {authState === 'guest' && (
        <div className="chat-gate">
          <IconLock size={16} stroke={1.5} style={{ flexShrink: 0 }} />
          <span>Logga in för att skicka meddelanden</span>
          <Link href="/profil" className="chat-gate-btn">Logga in</Link>
        </div>
      )}

      {authState === 'loggedIn' && (
        <div className="chat-input-row">
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Skriv ett meddelande…"
          />
          <button className="send-btn" onClick={sendMessage} type="button" aria-label="Skicka">
            <IconArrowUp size={18} stroke={2} />
          </button>
        </div>
      )}
    </div>
  );
}
