'use client';

import { useEffect, useRef, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { ref, onValue, query, orderByChild, update } from 'firebase/database';
import { auth, realtimeDb } from '@/lib/firebase-client';

type Conversation = {
  uid: string;
  customerName: string;
  customerEmail: string;
  lastMessage: string;
  lastAt: number;
};

type Message = {
  id: string;
  text: string;
  from: 'customer' | 'admin';
  timestamp: number;
};

export default function AdminChatPage() {
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sign in admin with custom Firebase token so RTDB rules are satisfied
  useEffect(() => {
    fetch('/api/admin/firebase-token')
      .then(r => {
        if (!r.ok) throw new Error(`Token request failed: ${r.status}`);
        return r.json();
      })
      .then(({ token }) => {
        if (!token) throw new Error('No token returned');
        return signInWithCustomToken(auth, token);
      })
      .then(() => setReady(true))
      .catch(err => {
        console.error('Firebase auth error:', err);
        setAuthError(String(err?.message ?? err));
      });
  }, []);

  // Listen to all conversations
  useEffect(() => {
    if (!ready) return;
    const chatsRef = ref(realtimeDb, 'chats');
    const unsub = onValue(chatsRef, snap => {
      const convos: Conversation[] = [];
      snap.forEach(child => {
        const d = child.val();
        if (d.uid) {
          convos.push({
            uid:           d.uid,
            customerName:  d.customerName  ?? 'Okänd',
            customerEmail: d.customerEmail ?? '',
            lastMessage:   d.lastMessage   ?? '',
            lastAt:        d.lastAt        ?? 0,
          });
        }
      });
      convos.sort((a, b) => b.lastAt - a.lastAt);
      setConversations(convos);
    });
    return unsub;
  }, [ready]);

  // Listen to messages for selected conversation
  useEffect(() => {
    if (!ready || !selectedUid) return;
    const msgQuery = query(
      ref(realtimeDb, `chats/${selectedUid}/messages`),
      orderByChild('timestamp'),
    );
    const unsub = onValue(msgQuery, snap => {
      const msgs: Message[] = [];
      snap.forEach(child => {
        msgs.push({ id: child.key!, ...child.val() });
      });
      setMessages(msgs);
    });
    return unsub;
  }, [ready, selectedUid]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendReply() {
    const text = input.trim();
    if (!text || !selectedUid) return;
    setInput('');

    const msgKey = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const updates: Record<string, unknown> = {
      [`chats/${selectedUid}/messages/${msgKey}`]: {
        text,
        from: 'admin',
        timestamp: Date.now(),
      },
      [`chats/${selectedUid}/lastMessage`]: text,
      [`chats/${selectedUid}/lastAt`]: Date.now(),
    };
    await update(ref(realtimeDb), updates);
  }

  const selected = conversations.find(c => c.uid === selectedUid);

  if (authError) {
    return (
      <div style={{ padding: '2rem', color: '#dc2626', background: '#fff', borderRadius: '10px', border: '1px solid #eee' }}>
        <strong>Firebase auth error:</strong> {authError}
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
          Check that ADMIN_UID is set in .env.local and that the Firebase service account is valid.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: '2rem', color: '#888', fontSize: '0.9rem' }}>
        Ansluter till Firebase…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1.5rem' }}>

      {/* Conversation list */}
      <div style={{
        width: '280px',
        flexShrink: 0,
        background: '#fff',
        borderRadius: '10px',
        border: '1px solid #eee',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: '0.9rem' }}>
          Konversationer
        </div>
        {conversations.length === 0 && (
          <div style={{ padding: '1.5rem', color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>
            Inga konversationer än.
          </div>
        )}
        {conversations.map(c => (
          <button
            key={c.uid}
            onClick={() => setSelectedUid(c.uid)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid #f5f5f5',
              background: selectedUid === c.uid ? '#f0f5f1' : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: '0.88rem', color: '#1e2e24' }}>
              {c.customerName}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.lastMessage}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#bbb', marginTop: 2 }}>
              {c.lastAt ? new Date(c.lastAt).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </button>
        ))}
      </div>

      {/* Chat thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '10px', border: '1px solid #eee', overflow: 'hidden' }}>
        {!selectedUid ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '0.9rem' }}>
            Välj en konversation
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selected?.customerName}</span>
              <span style={{ fontSize: '0.78rem', color: '#888' }}>{selected?.customerEmail}</span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {messages.map(msg => {
                const isAdmin = msg.from === 'admin';
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%',
                      background: isAdmin ? '#2d5a3d' : '#ede8de',
                      color: isAdmin ? '#c8e6c9' : '#1e2e24',
                      borderRadius: isAdmin ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding: '0.6rem 0.875rem',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                    }}>
                      <div>{msg.text}</div>
                      <div style={{ fontSize: '0.7rem', color: isAdmin ? 'rgba(200,230,201,0.6)' : '#9aaa9a', marginTop: 4, textAlign: 'right' }}>
                        {new Date(msg.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '0.5rem' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendReply()}
                placeholder="Skriv ett svar…"
                style={{
                  flex: 1,
                  border: '1px solid #e8e4db',
                  borderRadius: '8px',
                  padding: '0.6rem 0.875rem',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: '#faf9f7',
                }}
              />
              <button
                onClick={sendReply}
                style={{
                  background: '#2d5a3d',
                  color: '#c8e6c9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Skicka
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
