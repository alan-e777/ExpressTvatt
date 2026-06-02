import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/admin-auth";
import { geocodeAddress } from "@/lib/geocode";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runsSnap = await db.collection("runs")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (runsSnap.empty) return NextResponse.json({ run: null });

  const run = runsSnap.docs[0].data();
  const orderIds: string[] = run.orderIds ?? [];

  const orders = await Promise.all(
    orderIds.map(async (id) => {
      const snap = await db.collection("orders").doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      const fullAddress = [data.address, data.postalCode].filter(Boolean).join(", ");
      const coords = await geocodeAddress(fullAddress);
      return {
        id,
        address: data.address as string,
        postalCode: (data.postalCode as string) ?? "",
        serviceName: data.serviceName as string,
        status: data.status as string,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      };
    })
  );

  return NextResponse.json({
    run: {
      token: run.token as string,
      type: run.type as string,
      orders: orders.filter(Boolean),
    },
  });
}
