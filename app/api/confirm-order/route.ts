import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { settlePaidOrder } from "@/lib/order-fulfillment";

/**
 * Browser-side safety net, called immediately after `stripe.confirmPayment()`
 * resolves successfully.
 *
 * The customer's success screen must never be the only record that money moved.
 * If Stripe's webhook is misconfigured, delayed, or failing, this closes the gap
 * within milliseconds instead of leaving the order in `pending_payment`.
 *
 * The request body is untrusted — it carries only an intent id. Authority comes
 * from re-fetching that intent from Stripe and checking `status === 'succeeded'`
 * server-side, so a hostile caller posting arbitrary ids cannot mark anything
 * paid.
 */
export async function POST(request: NextRequest) {
  let paymentIntentId: string;
  try {
    ({ paymentIntentId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof paymentIntentId !== "string" || !paymentIntentId.startsWith("pi_")) {
    return NextResponse.json({ error: "Invalid paymentIntentId" }, { status: 400 });
  }

  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
  }

  if (intent.status !== "succeeded") {
    // Not an error: the browser may call this while the intent is still
    // processing. The webhook and the reconcile sweep will catch it later.
    return NextResponse.json({ settled: false, status: intent.status });
  }

  try {
    const result = await settlePaidOrder(intent, "client");
    return NextResponse.json({ settled: true, ...result });
  } catch (err) {
    console.error("[confirm-order] settle failed for", paymentIntentId, err);
    return NextResponse.json({ error: "Could not confirm order." }, { status: 500 });
  }
}
