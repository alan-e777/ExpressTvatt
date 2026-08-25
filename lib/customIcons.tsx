// Garment and tailoring icons drawn to match @tabler/icons-react exactly.
//
// Tabler ships ~5000 icons but its *apparel* vocabulary is thin — shirt, sport
// shirt, jacket, shoe, sock, tie and little else. There is no rug, no trousers,
// no dress, skirt, coat, hat, button, zipper or spool, which is most of what a
// tailor and dry cleaner actually sells.
//
// These fill that gap rather than pulling in a second icon library: two libraries
// in one picker means two drawing styles side by side. Every icon here uses
// Tabler's grammar — 24×24 grid, `fill: none`, `stroke: currentColor`, round caps
// and joins, weight supplied by the caller — so they inherit the surrounding
// colour exactly like the Tabler ones do and cannot drift out of step with the
// theme.
//
// ── Adding one ───────────────────────────────────────────────────────────────
// Draw on the 24×24 grid, keeping roughly 3px of padding, and export it through
// `icon(...)`. Then register it in PRODUCT_ICONS (lib/productIcons.tsx).

import type { ComponentType, ReactNode } from "react";

export type IconProps = { size: number; stroke: number };

/** Wraps path data in the same SVG envelope every Tabler outline icon uses. */
function icon(paths: ReactNode): ComponentType<IconProps> {
  const Component = ({ size, stroke }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
  return Component;
}

/** Rug seen flat, fringed on both short edges. */
export const IconRug = icon(
  <>
    <path d="M4 8h16v8H4z" />
    <path d="M7 12h10" />
    <path d="M6 8V5.5M10 8V5.5M14 8V5.5M18 8V5.5" />
    <path d="M6 16v2.5M10 16v2.5M14 16v2.5M18 16v2.5" />
  </>,
);

/** Trousers — waistband and two legs. */
export const IconTrousers = icon(
  <>
    <path d="M6 3h12v18h-4l-2-9-2 9H6z" />
    <path d="M6 6h12" />
  </>,
);

/** A-line skirt with a waistband. */
export const IconSkirt = icon(
  <>
    <path d="M8 4h8v3l3 13H5l3-13z" />
    <path d="M8 7h8" />
  </>,
);

/** Dress — bodice over a flared skirt. */
export const IconDress = icon(
  <>
    <path d="M9 3h6v6l4 12H5l4-12z" />
    <path d="M9 9h6" />
  </>,
);

/** Long coat with lapels and a belt. */
export const IconCoat = icon(
  <>
    <path d="M9 3l3 3 3-3 4 2v16H5V5z" />
    <path d="M5 13h14" />
    <path d="M9 3v3M15 3v3" />
  </>,
);

/** Hat / beanie — crown and brim. */
export const IconHat = icon(
  <>
    <path d="M4 14a8 8 0 0 1 16 0" />
    <path d="M3 14h18v4H3z" />
  </>,
);

/** Loose fabric, drawn as folds. Stands in for scarves, shawls and cloth goods. */
export const IconFabric = icon(
  <>
    <path d="M4 7c2.7-2 5.3 2 8 0s5.3-2 8 0" />
    <path d="M4 12c2.7-2 5.3 2 8 0s5.3-2 8 0" />
    <path d="M4 17c2.7-2 5.3 2 8 0s5.3-2 8 0" />
  </>,
);

/** Four-hole button. */
export const IconButton = icon(
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M9.8 9.8h.01M14.2 9.8h.01M9.8 14.2h.01M14.2 14.2h.01" />
  </>,
);

/** Zipper — interlocking teeth, slider and pull. */
export const IconZipper = icon(
  <>
    <path d="M7.5 3v8.5M16.5 3v8.5" />
    <path d="M7.5 4.5h3M13.5 4.5h3M7.5 7h3M13.5 7h3M7.5 9.5h3M13.5 9.5h3" />
    <path d="M7.5 11.5h9v2.5l-4.5 2.5-4.5-2.5z" />
    <path d="M12 16.5V21" />
  </>,
);

/** Spool of thread. */
export const IconThreadSpool = icon(
  <>
    <path d="M6 3h12v2H6zM6 19h12v2H6z" />
    <path d="M8 5h8v14H8z" />
    <path d="M8 9h8M8 13h8" />
  </>,
);

/** Folded towel. */
export const IconTowel = icon(
  <>
    <path d="M6 4h12v13a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" />
    <path d="M6 8h12M6 10h12" />
  </>,
);

/** Duvet / quilt, turned down at the top. */
export const IconDuvet = icon(
  <>
    <path d="M4 9c0-2.2 2-4 4.5-4h7C18 5 20 6.8 20 9v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path d="M4 9h16" />
    <path d="M9 13v3M12 12.5v3.5M15 13v3" />
  </>,
);
