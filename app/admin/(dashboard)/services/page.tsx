import { db } from "@/lib/firebase-admin";
import ServicesPage from "./ServicesPage";
import type { StrukenProduct } from "./StrukenTvattEditor";

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
    };
  });

  return (
    <ServicesPage initialStrukenProducts={strukenProducts} />
  );
}
