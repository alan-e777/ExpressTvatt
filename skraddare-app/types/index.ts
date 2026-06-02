export type CartItem = {
  id:    string;
  name:  string;
  price: number;  // kr
  qty:   number;
  type:  'mattvätt' | 'struken' | 'service';
};

export type CustomField = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  price_ore: number;
  icon: string;
  customFields?: CustomField[];
};

export type BookingForm = {
  service: Service;
  address: string;
  postalCode: string;
  date: string;
  time: string;
  description: string;
  customFieldValues?: Record<string, string>;
};

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'collected'
  | 'in_progress'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

export type Order = {
  id: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  paymentIntentId: string;
  createdAt: Date;
};

export function formatPrice(ore: number): string {
  return `${ore / 100} kr`;
}
