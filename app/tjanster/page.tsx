import { redirect } from 'next/navigation';

/**
 * Retired checkout path.
 *
 * `/tjanster → /boka → /checkout` was a parallel booking flow that never
 * collected the customer's name, email or phone, and skipped the availability
 * check, RUT-avdrag, discounts and delivery fees that `/order → /kassa`
 * applies. Orders placed through it could not be confirmed by email — and for
 * a logged-out customer, could not be contacted at all.
 *
 * `/order` covers every item type this page offered (tjänster, struken tvätt
 * and mattvätt), so this route now redirects there. The original implementation
 * is in git history if it is ever needed.
 */
export default function TjansterPage() {
  redirect('/order');
}
