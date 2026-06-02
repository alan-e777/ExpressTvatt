const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type Prediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export async function fetchSuggestions(query: string): Promise<Prediction[]> {
  if (!query.trim() || query.length < 3) return [];

  try {
    const res = await fetch(
      `${API_URL}/api/places/autocomplete?input=${encodeURIComponent(query)}`,
    );
    const data = await res.json();
    return data.predictions ?? [];
  } catch {
    return [];
  }
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<{ address: string; postalCode: string }> {
  if (!API_KEY) return { address: '', postalCode: '' };

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'address_components',
    key: API_KEY,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
  );
  const data = await res.json();

  if (data.status !== 'OK') return { address: '', postalCode: '' };

  const comps: Array<{ long_name: string; types: string[] }> =
    data.result.address_components ?? [];

  const route = comps.find(c => c.types.includes('route'))?.long_name ?? '';
  const streetNumber =
    comps.find(c => c.types.includes('street_number'))?.long_name ?? '';
  const postalRaw =
    comps.find(c => c.types.includes('postal_code'))?.long_name ?? '';

  const address = streetNumber ? `${route} ${streetNumber}` : route;
  const digits = postalRaw.replace(/\D/g, '');
  const postalCode =
    digits.length === 5 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : postalRaw;

  return { address, postalCode };
}
