import { redirect } from 'next/navigation';
import CheckoutWrapper from '@/components/CheckoutWrapper';
import Link from 'next/link';

type SearchParams = Promise<{
  serviceId?:   string;
  serviceName?: string;
  priceOre?:    string;
  address?:     string;
  postalCode?:  string;
  date?:        string;
  time?:        string;
  notes?:       string;
  customFields?:string;
  customerId?:  string;
}>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const p = await searchParams;
  if (!p.serviceId) redirect('/tjanster');

  const bookingParams = {
    serviceId:    p.serviceId,
    serviceName:  p.serviceName  ?? '',
    priceOre:     Number(p.priceOre ?? 0),
    address:      p.address      ?? '',
    postalCode:   p.postalCode   ?? '',
    date:         p.date         ?? '',
    time:         p.time         ?? '',
    notes:        p.notes        ?? '',
    customFields: (() => { try { return JSON.parse(p.customFields ?? '{}'); } catch { return {}; } })(),
    customerId:   p.customerId,
  };

  return <CheckoutWrapper bookingParams={bookingParams} />;
}
