import { db } from "@/lib/firebase-admin";
import ServicesPage from "./ServicesPage";
import type { StrukenProduct } from "./StrukenTvattEditor";

// Always re-read Firestore on each request. Without this the route is served
// from Next's static full-route cache, so adds/deletes don't appear on reload.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Fetch Struken Tvätt products (subcollection under services/struken-tvatt)
  const strukenSnap = await db.collection("services").doc("struken-tvatt").collection("StrukenTvatt").orderBy("order").get();
  const strukenProducts: StrukenProduct[] = strukenSnap.docs.map(d => {
    const data = d.data();
    return {
      id:              d.id,
      name:            data.name ?? "",
      price:           data.price ?? 0,
      category:        data.category ?? "",
      order:           data.order ?? 0,
      discountPercent: data.discountPercent ?? 0,
      icon:            data.icon ?? "",
    };
  });

  return (
    <ServicesPage initialStrukenProducts={strukenProducts} />
  );
}
