import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Session expired — please sign in again." }, { status: 403 });

  const { name, price, category } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!price || isNaN(Number(price))) return NextResponse.json({ error: "Price is required." }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Category is required." }, { status: 400 });

  // Auto-assign order as max + 1 within the category
  const existing = await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").where("category", "==", category).get();
  const maxOrder = existing.docs.reduce((m, d) => Math.max(m, d.data().order ?? 0), 0);

  // ID: slug from category + name
  const slug = `${category.toLowerCase()}-${name.trim().toLowerCase().replace(/[^a-z0-9åäöÅÄÖ]+/gi, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;

  const doc = {
    id:       slug,
    name:     name.trim(),
    price:    Number(price),
    category,
    order:    maxOrder + 1,
  };

  try {
    await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").doc(slug).set(doc);
    return NextResponse.json({ ok: true, id: slug });
  } catch (err) {
    console.error("[struken-tvatt POST]", err);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }
}
