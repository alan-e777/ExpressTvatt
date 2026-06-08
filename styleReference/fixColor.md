# UI Fix: Replace bright blue card background

## Problem

The main booking page has a large bright blue card (`~#29ABD4`) wrapping all content. This color doesn't exist in the brand palette and clashes with the rest of the design.

## Brand palette (for reference)

| Name      | Hex       | Use                        |
|-----------|-----------|----------------------------|
| Houilee   | `#B7DCD7` | Light teal accent          |
| Text      | `#0E5C5B` | Body text, mid teal        |
| Gold      | `#D4AF37` | Warm accent                |
| Tan       | `#DCCBA3` | Warm neutral               |
| Hanger    | `#1E3F6C` | Dark navy accent           |
| Tagline   | `#6BB3AC` | Mid teal                   |
| Deep Teal | `#063F41` | Dark background            |

## What to change

Replace the bright blue wrapper/card background with a warm off-white or cream tone that bridges the white content cards and the dark teal page background.

**Target color:** `#F5F0E8` (warm cream, close to Tan but lighter — use this if no exact cream variable exists yet)

If there's already a CSS variable or Tailwind token for the Tan/cream tone in the design system, use that instead of hardcoding the hex.

## Scope

- Find the component or CSS class responsible for the large blue card on the home/booking page (likely the wrapper around the "Vad vill du lämna in?" section and the service cards below it)
- Change its background color from the current blue to `#F5F0E8` (or the equivalent design token)
- Do **not** touch:
  - The white inner cards (service cards, booking sidebar)
  - The golden-outlined eco banner
  - The "Pågående rengöringar" order tracker card (keep its existing warm border)
  - The page's dark teal outer background

## Expected result

Dark teal page background → warm cream main card → white inner cards

This matches the visual hierarchy implied by the brand color layout.
