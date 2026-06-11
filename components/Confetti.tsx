'use client';

import { useEffect, useState } from 'react';

// Brand-palette confetti — deep teal, light teal, moss, gold, pale gold.
const COLORS = ['#6BB3AC', '#B7DCD7', '#D4AF37', '#083F41', '#EADBA8'];

type Piece = { left: number; delay: number; duration: number; bg: string; size: number; rot: number; drift: number; round: boolean };

/** Pure-CSS confetti burst (no dependencies). Respects prefers-reduced-motion.
 *  Pieces are generated after mount so the random values never cause an SSR
 *  hydration mismatch (SSR renders an empty container). */
export default function Confetti({ count = 70 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    setPieces(
      Array.from({ length: count }).map((_, i) => ({
        left:     Math.random() * 100,
        delay:    Math.random() * 0.5,
        duration: 2.6 + Math.random() * 2,
        bg:       COLORS[i % COLORS.length],
        size:     6 + Math.random() * 7,
        rot:      (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
        drift:    (Math.random() - 0.5) * 120,
        round:    Math.random() > 0.6,
      })),
    );
  }, [count]);

  return (
    <div className="of-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="of-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.7,
            background: p.bg,
            borderRadius: p.round ? '50%' : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // custom props consumed by the keyframes in globals.css
            ['--drift' as string]: `${p.drift}px`,
            ['--rot' as string]: `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
