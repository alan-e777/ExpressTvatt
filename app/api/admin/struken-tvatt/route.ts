import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { clampPct } from "@/lib/discount";

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { name, price, category, discountPercent, icon, inputDisabled, inputPlaceholder } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  // Never negative: the payment route prices from this catalogue, so a negative
  // value would subtract from the rest of the customer's basket. Exactly 0 is
  // allowed and means a *test item* — a basket of nothing but 0 kr lines skips
  // Stripe entirely, so an order can be placed and deleted without a refund.
  // Such items are hidden from customers and only orderable by an admin.
  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    return NextResponse.json({ error: "Priset kan inte vara negativt." }, { status: 400 });
  }
  if (!category) return NextResponse.json({ error: "Category is required." }, { status: 400 });

  // Auto-assign order as max + 1 within the category
  const existing = await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").where("category", "==", category).get();
  const maxOrder = existing.docs.reduce((m, d) => Math.max(m, d.data().order ?? 0), 0);

  // ID: slug from category + name
  const slug = `${category.toLowerCase()}-${name.trim().toLowerCase().replace(/[^a-z0-9åäöÅÄÖ]+/gi, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;

  const doc = {
    id:              slug,
    name:            name.trim(),
    price:           Number(price),
    category,
    order:           maxOrder + 1,
    discountPercent: clampPct(discountPercent ?? 0),
    icon:            typeof icon === 'string' ? icon : '',
    inputDisabled:    !!inputDisabled,
    inputPlaceholder: typeof inputPlaceholder === 'string' ? inputPlaceholder.trim() : '',
  };

  try {
    await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").doc(slug).set(doc);
    return NextResponse.json({ ok: true, id: slug });
  } catch (err) {
    console.error("[struken-tvatt POST]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
