import { db } from "@/lib/firebase-admin";
import { DEFAULT_SERVICE_AREA, normalizeServiceArea, type ServiceArea } from "@/lib/serviceArea";

/**
 * The admin's service area, read from `settings/driver`.
 *
 * Kept apart from `lib/serviceArea.ts` because that module is imported by the
 * settings page in the browser and must not pull in `firebase-admin`.
 *
 * Never throws and never returns an unusable area: a missing document, a
 * malformed polygon or a failed read all fall back to something bookable. An
 * address field that goes dead because of a bad settings document would take the
 * whole checkout with it.
 */
export async function getServiceArea(): Promise<ServiceArea> {
  try {
    const snap = await db.collection("settings").doc("driver").get();
    return normalizeServiceArea(snap.exists ? snap.data()?.serviceArea : null);
  } catch {
    return DEFAULT_SERVICE_AREA;
  }
}
