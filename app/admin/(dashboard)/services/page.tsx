import { db } from "@/lib/firebase-admin";
import ServicesPage from "./ServicesPage";
import type { StrukenProduct } from "./StrukenTvattEditor";
import type { ProductWarning } from "./WarningsManager";
import type { CategoryMeta } from "@/lib/serviceCategories";
import { normalizeMattvattSettings, type MattvattSettings } from "@/lib/mattvatt";
import { normalizePricing } from "@/lib/serviceUnits";

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
      warningIds:      data.warningIds ?? [],
      inputDisabled:    !!data.inputDisabled,
      inputPlaceholder: data.inputPlaceholder ?? "",
      // Per piece / per kilo / per m², plus the range a measured item's slider
      // offers. Normalized here so an item saved before units existed arrives
      // as a plain `st` product rather than as undefined fields.
      ...normalizePricing(data),
    };
  });

  // Reusable "bra att veta" remarks, referenced by the products above.
  const warningsSnap = await db.collection("product_warnings").orderBy("order").get();
  const warnings: ProductWarning[] = warningsSnap.docs.map(d => ({
    id:    d.id,
    text:  d.data().text ?? "",
    order: d.data().order ?? 0,
  }));

  // How each category is presented on the order page. Which categories exist is
  // decided by the products above; this only carries icon/description/order.
  const categoriesSnap = await db.collection("service_categories").get();
  const categoryMeta: CategoryMeta[] = categoriesSnap.docs
    .map(d => {
      const data = d.data();
      return {
        name:     data.name ?? "",
        icon:     data.icon ?? "",
        desc:     data.desc ?? "",
        subtitle: data.subtitle ?? "",
        order:    typeof data.order === "number" ? data.order : 0,
        hidden:   data.hidden === true,
        requiresInput:    !!data.requiresInput,
        inputLabel:       data.inputLabel ?? "",
        inputPlaceholder: data.inputPlaceholder ?? "",
      };
    })
    .filter(m => m.name);

  // Mattvätt has no catalogue products — it is priced per m² — so its "products"
  // (the rug types) come from its settings doc instead.
  const mattvattSnap = await db.collection("settings").doc("mattvatt").get();
  const mattvatt: MattvattSettings = normalizeMattvattSettings(
    mattvattSnap.exists ? (mattvattSnap.data() as Partial<MattvattSettings>) : null,
  );

  return (
    <ServicesPage
      initialStrukenProducts={strukenProducts}
      initialWarnings={warnings}
      initialCategoryMeta={categoryMeta}
      initialMattvatt={mattvatt}
    />
  );
}
