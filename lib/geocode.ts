const cache = new Map<string, { lat: number; lng: number }>();

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (cache.has(address)) return cache.get(address)!;

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";
  if (!API_KEY) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === "OK") {
      const { lat, lng } = data.results[0].geometry.location;
      const result = { lat, lng };
      cache.set(address, result);
      return result;
    }
  } catch { /* fall through */ }
  return null;
}
