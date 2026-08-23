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
};

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
const CATEGORY_DEFAULTS: Record<string, Omit<CategoryMeta, 'name'>> = {
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
  };
}

/** Ascending `order`, then Swedish-alphabetical — the site and admin both use this. */
export function compareCategories(a: CategoryMeta, b: CategoryMeta): number {
  return a.order - b.order || a.name.localeCompare(b.name, 'sv');
}
