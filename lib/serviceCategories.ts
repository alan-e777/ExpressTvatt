// Display metadata for the customer-facing category rows on /order.
//
// The catalogue is the source of truth for *which* categories exist: every
// distinct `category` value on a StrukenTvatt product is a category, in the
// admin editor and on the order page alike. Nothing is hard-coded, so a
// category the admin creates shows up on the site as its own row.
//
// This module only carries how each one is *presented* — icon, the one-liner in
// the list, the subtitle in the opened detail header and the sort order — which
// the admin edits under Tjänster and which lives in `service_categories`.

import { amountKey } from './serviceUnits';

/** Editable presentation for one category. `name` matches the products' `category`. */
export type CategoryMeta = {
  /** Exact `category` value stored on the products — the identity here too. */
  name:     string;
  /** A key from PRODUCT_ICONS (`lib/productIcons.tsx`). */
  icon:     string;
  /** One-liner under the title in the category list. */
  desc:     string;
  /** Longer line in the opened category's header. */
  subtitle: string;
  /** Ascending; ties broken alphabetically. */
  order:    number;
  /**
   * Taken off the customer-facing site without deleting anything. The catalogue
   * keeps every product, the admin keeps editing them, and the category simply
   * stops being offered — which is what a seasonal service needs between
   * seasons. Enforced server-side too: /api/create-cart-payment refuses lines
   * from a hidden category, so an old cart link cannot still buy one.
   */
  hidden:   boolean;
  /**
   * Whether picking an item in this category asks the customer for a note
   * first — a tailoring category needs "korta 2 cm" to be actionable. Single
   * items can opt out with `inputDisabled` on the product.
   */
  requiresInput:    boolean;
  /** Question shown above the field, e.g. "Vad ska göras?". */
  inputLabel:       string;
  /** Default placeholder for the field; a product may override it. */
  inputPlaceholder: string;
};

/** The per-product half of the input settings above. */
export type ProductInputMeta = {
  /** Opt this one item out of the category's input requirement. */
  inputDisabled?:   boolean;
  /** Overrides the category's placeholder for this item only. */
  inputPlaceholder?: string;
};

/** Shown when neither the product nor the category names a placeholder. */
export const DEFAULT_INPUT_PLACEHOLDER = "T.ex. korta 2 cm";
/** Shown when the category names no label. */
export const DEFAULT_INPUT_LABEL = "Beskriv vad som ska göras";

/**
 * The one category that is not catalogue-backed: mattvätt is priced per m² from
 * `settings/mattvatt`, so it has no StrukenTvatt products and is always shown.
 */
export const MATTVATT_CATEGORY = 'Mattvätt';

/** Fallback icon for a category the admin hasn't given one yet. */
export const DEFAULT_CATEGORY_ICON = 'wash';

/** Categories created after launch sort below the four the site shipped with. */
export const NEW_CATEGORY_ORDER = 100;

/**
 * Firestore doc id for a category — its name slugified. Keeps the ids of the
 * four original categories identical to the `CatId`s the page used to hard-code
 * (`hushallstvatt`, `mattvatt`, `hem`, `tvatt`), so anchors and links survive.
 */
export function categoryDocId(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'kategori'
  );
}

// The presentation the site shipped with, applied when a category has no doc in
// `service_categories` yet. Keyed by doc id so it survives casing differences.
// Only the presentation half — customer input is off everywhere until an admin
// turns it on, so it has no per-category default.
const CATEGORY_DEFAULTS: Record<string, Pick<CategoryMeta, 'icon' | 'desc' | 'subtitle' | 'order'>> = {
  hushallstvatt: {
    icon: 'wash', order: 10,
    desc: 'Tvätt per kilo & plagg',
    subtitle: 'Tvätt per kilo och styckvis — hämtning & leverans ingår',
  },
  mattvatt: {
    icon: 'spray', order: 20,
    desc: 'Djuptvätt av mattor',
    subtitle: 'Djuptvätt av mattor — hämtning & leverans ingår alltid',
  },
  hem: {
    icon: 'sparkles', order: 30,
    desc: 'Hemtextil & möbeltextil',
    subtitle: 'Täcken, kuddar, gardiner, madrasser & möbeltextil',
  },
  tvatt: {
    icon: 'steam', order: 40,
    desc: 'Kemtvätt & finare plagg',
    subtitle: 'Kemtvätt av kostym, klänning, ytterplagg m.m.',
  },
};

/**
 * Merge a category name with whatever the admin has saved for it, falling back
 * to the shipped defaults and then to generic values. Used by both the order
 * page and the admin editor so the two never drift.
 */
export function resolveCategoryMeta(name: string, stored?: Partial<CategoryMeta> | null): CategoryMeta {
  const fallback = CATEGORY_DEFAULTS[categoryDocId(name)];
  return {
    name,
    icon:     stored?.icon     || fallback?.icon     || DEFAULT_CATEGORY_ICON,
    desc:     stored?.desc     ?? fallback?.desc     ?? '',
    subtitle: stored?.subtitle ?? fallback?.subtitle ?? '',
    order:    typeof stored?.order === 'number' ? stored.order : fallback?.order ?? NEW_CATEGORY_ORDER,
    hidden:   stored?.hidden ?? false,
    requiresInput:    stored?.requiresInput ?? false,
    inputLabel:       stored?.inputLabel ?? '',
    inputPlaceholder: stored?.inputPlaceholder ?? '',
  };
}

/**
 * Does adding this product ask the customer for a note first? The category
 * turns it on for everything it holds; a single product can opt back out.
 */
export function requiresCustomerInput(meta: Pick<CategoryMeta, 'requiresInput'>, product: ProductInputMeta): boolean {
  return meta.requiresInput && !product.inputDisabled;
}

/** Placeholder for the note field: product override, else category, else generic. */
export function inputPlaceholderFor(meta: Pick<CategoryMeta, 'inputPlaceholder'>, product: ProductInputMeta): string {
  return product.inputPlaceholder?.trim() || meta.inputPlaceholder?.trim() || DEFAULT_INPUT_PLACEHOLDER;
}

/** Question above the note field. */
export function inputLabelFor(meta: Pick<CategoryMeta, 'inputLabel'>): string {
  return meta.inputLabel?.trim() || DEFAULT_INPUT_LABEL;
}

/**
 * Cart-line identity: two notes on one product are two separate lines, and so
 * are two amounts of a measured (per kg / per m²) product — 3 kg and 5 kg are
 * different prices, so they cannot collapse into a quantity of two.
 */
export function cartLineKey(id: string, note?: string, amount?: number): string {
  const parts = [id];
  if (amount !== undefined) parts.push(`@${amountKey(amount)}`);
  if (note?.trim())         parts.push(`::${note.trim()}`);
  return parts.join('');
}

/** Ascending `order`, then Swedish-alphabetical — the site and admin both use this. */
export function compareCategories(a: CategoryMeta, b: CategoryMeta): number {
  return a.order - b.order || a.name.localeCompare(b.name, 'sv');
}
