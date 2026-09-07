// Google Places, via the *new* Places API.
//
// The legacy endpoints (`maps/api/place/autocomplete/json` and `.../details/json`)
// that this app used until now are switched off for any Cloud project created
// after March 2025. On such a project they answer REQUEST_DENIED with "You're
// calling a legacy API" and nothing enables them again — the only fix is this
// one, moving to `places.googleapis.com/v1`.
//
// The two surfaces that call it — the customer's address field and the driver
// address box — keep their existing response shapes, so `AddressAutocomplete`
// and the iOS app's `lib/places.ts` need no changes. That is the whole point of
// normalising here: the new API's field names (`placeId`, `text.text`,
// `longText`) are converted back to the legacy ones at this boundary and go no
// further into the codebase.
//
// Everything here throws on failure rather than returning empty. The old routes
// turned every error into an empty prediction list with nothing logged, which is
// exactly why a completely dead address field produced no console output and no
// server error — it looked identical to "no matches for that street".

const BASE = 'https://places.googleapis.com/v1';

export type ServiceArea = { lat: number; lng: number; radiusKm: number };

/** One suggestion, in the legacy shape both clients already parse. */
export type LegacyPrediction = {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
};

/**
 * Address-ish primary types, the nearest equivalent of the legacy
 * `types=address`. All four are Table B types the new API accepts, and the cap
 * is five. If Google ever rejects one, `autocompleteAddresses` retries without
 * the filter rather than leaving the customer with a dead field.
 */
const ADDRESS_TYPES = ['street_address', 'premise', 'subpremise', 'route'];

/** The new API caps a circular restriction at 50 km; a wider service area is clamped. */
function radiusMetres(area: ServiceArea): number {
  const m = Math.round((Number(area.radiusKm) || 0) * 1000);
  return Math.min(50_000, Math.max(1, m));
}

class PlacesError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`Places API ${status}: ${body.slice(0, 400)}`);
    this.name = 'PlacesError';
  }
}

async function post(path: string, key: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new PlacesError(res.status, await res.text());
  return res.json();
}

/**
 * Address suggestions inside the admin's service circle.
 *
 * `locationRestriction` is the new API's name for what the legacy call did with
 * `location` + `radius` + `strictbounds=true`: a hard boundary, not a nudge, so
 * the customer cannot be offered an address the driver will not travel to.
 */
export async function autocompleteAddresses(
  input: string,
  area: ServiceArea,
  key: string,
): Promise<LegacyPrediction[]> {
  const body: Record<string, unknown> = {
    input,
    languageCode: 'sv',
    includedRegionCodes: ['se'],
    includedPrimaryTypes: ADDRESS_TYPES,
    locationRestriction: {
      circle: {
        center: { latitude: Number(area.lat), longitude: Number(area.lng) },
        radius: radiusMetres(area),
      },
    },
  };

  let data: any;
  try {
    data = await post('/places:autocomplete', key, body);
  } catch (err) {
    // A 400 is almost always the type filter — a rejected type would otherwise
    // take the whole address field down. Retry unfiltered and say so in the log:
    // noisier suggestions beat a checkout nobody can complete.
    if (err instanceof PlacesError && err.status === 400) {
      console.error('[places] autocomplete rejected the type filter, retrying without it:', err.message);
      delete body.includedPrimaryTypes;
      data = await post('/places:autocomplete', key, body);
    } else {
      throw err;
    }
  }

  // A suggestion is either a place or a free-text query; only the former has an
  // id worth resolving, so query predictions are dropped rather than shown as
  // options that lead nowhere.
  return (data.suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any): LegacyPrediction => ({
      place_id: p.placeId ?? '',
      description: p.text?.text ?? '',
      structured_formatting: {
        main_text: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondary_text: p.structuredFormat?.secondaryText?.text ?? '',
      },
    }))
    .filter((p: LegacyPrediction) => p.place_id && p.description);
}

/** Street address and postcode for one place id, formatted the Swedish way. */
export async function placeAddress(
  placeId: string,
  key: string,
): Promise<{ address: string; postalCode: string }> {
  // The field mask is required and is also what the call is billed on, so it
  // asks for address components and nothing else.
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'addressComponents' },
  });
  if (!res.ok) throw new PlacesError(res.status, await res.text());
  const data = await res.json();

  const comps: Array<{ longText?: string; types?: string[] }> = data.addressComponents ?? [];
  const pick = (type: string) => comps.find(c => c.types?.includes(type))?.longText ?? '';

  const route        = pick('route');
  const streetNumber = pick('street_number');
  const postalRaw    = pick('postal_code');

  const address = streetNumber ? `${route} ${streetNumber}` : route;
  const digits  = postalRaw.replace(/\D/g, '');
  const postalCode = digits.length === 5 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : postalRaw;

  return { address, postalCode };
}
