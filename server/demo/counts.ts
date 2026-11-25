import type { Transaction } from "@libsql/client";
import { capture, type CapturedRow } from "./provenance.js";
import { defaults, type Counts } from "./fixtures.js";
export async function actualCounts(
  tx: Transaction,
  id: string,
  current?: Map<string, CapturedRow>,
) {
  const rows = current ?? (await capture(tx)),
    owned = (
      await tx.execute({
        sql: "SELECT table_name,pk_json FROM demo_records WHERE batch_id=?",
        args: [id],
      })
    ).rows
      .map((r) => rows.get(String(r.table_name) + "\0" + String(r.pk_json)))
      .filter((r): r is CapturedRow => !!r);
  const table = (name: string) =>
      owned.filter((r) => r.table === name).map((r) => r.values),
    providers = table("provider_accounts"),
    providerIds = new Set(providers.map((r) => r.user_id));
  const counts: Counts = {
    managers: table("users").filter((r) => r.role === "hostel_manager").length,
    hostels: table("properties").filter((r) => r.kind === "hostel").length,
    roomTypes: table("room_types").length,
    travelers: table("users").filter(
      (r) => r.role === "traveler" && !providerIds.has(r.id),
    ).length,
    rentals: table("properties").filter((r) => r.kind === "rental").length,
    rentalInquiries: table("rental_inquiries").length,
    employers: providers.filter((r) => r.provider_role === "job_provider")
      .length,
    applicants: new Set(table("job_applications").map((r) => r.contact)).size,
    jobs: table("job_postings").length,
    jobApplications: table("job_applications").length,
    tourProviders: providers.filter((r) => r.provider_role === "tour_provider")
      .length,
    tours: table("tour_listings").length,
    tourBookings: table("tour_bookings").length,
    services: table("service_listings").length,
    serviceRequests: table("service_requests").length,
    reservations: table("bookings").length,
    articles: table("articles").length,
    reviews: table("reviews").length,
    coupons: table("coupons").length,
  };
  return {
    counts,
    physicalInventory: table("physical_units").length,
    trackedRows: owned.length,
  };
}
export function assertCounts(expected: Counts, actual: Counts) {
  for (const key of Object.keys(defaults) as (keyof Counts)[])
    if (expected[key] !== actual[key])
      throw Error("Persistent synthetic count mismatch: " + key);
}
