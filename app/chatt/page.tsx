'use client';

import { useState, useRef, useEffect } from 'react';
import { IconArrowUp } from '@tabler/icons-react';

type Message = { id: string; text: string; from: 'customer' | 'tailor'; time: string };

const INITIAL_MESSAGES: Message[] = [
  { id: '1', text: 'Hej! Hur kan jag hjälpa dig?', from: 'tailor', time: '10:02' },
  { id: '2', text: 'Hej! Jag undrar om lagning av en jacka.', from: 'customer', time: '10:04' },
  { id: '3', text: 'Självklart, berätta gärna mer om vad som behöver lagas.', from: 'tailor', time: '10:05' },
];

export default function ChattPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input,    setInput]    = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [
      ...prev,
      {
        id:   String(Date.now()),
        text,
        from: 'customer',
        time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInput('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="chat-shell">
      <div className="chat-list">
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column',
            alignItems: msg.from === 'customer' ? 'flex-end' : 'flex-start' }}>
            <div className={`bubble ${msg.from === 'customer' ? 'bubble-right' : 'bubble-left'}`}>
              <p className={msg.from === 'customer' ? 'bubble-text-right' : 'body'}
                style={{ lineHeight: '21px' }}>
                {msg.text}
              </p>
              <p className={`bubble-time ${msg.from === 'customer' ? 'time-right' : 'time-left'}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="notice-bar">
        Realtidschatt aktiveras när Firebase är kopplat
      </div>

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
    </div>
  );
}
