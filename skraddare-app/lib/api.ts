const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function createPaymentIntent(serviceId: string, customerId?: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId, customerId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Kunde inte starta betalning.');
  }

  const data = await res.json();
  return data.clientSecret as string;
}
