"use client";

/**
 * TEMPORARY — remove together with the wishlist after launch.
 *
 * The animated violet frame shared by the top-right composer and the Settings
 * list. Styling lives in globals.css under the `wl-` namespace.
 */

/** Decorative drifting particles. Offsets are fixed so they don't re-randomise on every render. */
const PARTICLES = [
  { left: "12%", delay: "0s",   duration: "5.2s" },
  { left: "28%", delay: "1.4s", duration: "6.1s" },
  { left: "47%", delay: "2.7s", duration: "4.8s" },
  { left: "66%", delay: "0.8s", duration: "5.9s" },
  { left: "83%", delay: "3.3s", duration: "5.4s" },
  { left: "94%", delay: "2.1s", duration: "6.4s" },
];

export function WishParticles() {
  return (
    <>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="wl-particle"
          aria-hidden="true"
          style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
        />
      ))}
    </>
  );
}

export function WishFrame({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`wl-frame${className ? ` ${className}` : ""}`} style={style}>
      <div className="wl-inner">
        <WishParticles />
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export function SparkleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.9 5.7L19.6 9.6l-5.7 1.9L12 17.2l-1.9-5.7L4.4 9.6l5.7-1.9L12 2z" />
      <path d="M18.5 14.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" opacity="0.7" />
    </svg>
  );
}
