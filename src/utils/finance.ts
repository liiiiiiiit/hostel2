import type { Booking } from "../types/index.js";
import type { FinanceEntry } from "../types/operations.js";
export function financeSummary(bookings: Booking[], entries: FinanceEntry[]) {
  const reservationValue = bookings.reduce(
    (sum, b) => sum + b.finalAmountAMD,
    0,
  );
  const expectedBase = bookings.reduce((sum, b) => {
    const rule = b.commissionRule;
    if (
      !rule ||
      !["confirmed", "completed"].includes(b.status) ||
      (rule.appliesOn === "completed" && b.status !== "completed")
    )
      return sum;
    return (
      sum +
      (rule.type === "percent"
        ? Math.round((b.finalAmountAMD * rule.value) / 100)
        : rule.type === "fixed"
          ? rule.value
          : 0)
    );
  }, 0);
  const total = (kind: FinanceEntry["kind"]) =>
    entries
      .filter((e) => e.kind === kind)
      .reduce((sum, e) => sum + e.amountAMD, 0);
  const expected = expectedBase + total("adjustment"),
    received = total("settlement");
  const responses = bookings.flatMap((b) => {
    const event = b.history?.find(
      (e) => e.action === "confirmed" || e.action === "rejected",
    );
    return event ? [Date.parse(event.at) - Date.parse(b.createdAt)] : [];
  });
  const decided = bookings.filter(
    (b) => b.confirmedAt || b.status === "rejected",
  );
  return {
    reservationValue,
    propertyPayment: total("property_payment"),
    expected,
    received,
    balance: expected - received,
    confirmationRate: decided.length
      ? bookings.filter((b) => b.confirmedAt).length / decided.length
      : null,
    averageResponseMinutes: responses.length
      ? responses.reduce((a, b) => a + b, 0) / responses.length / 60000
      : null,
    cancellations: bookings.filter((b) => b.status === "cancelled").length,
    noShows: bookings.filter((b) => b.status === "no_show").length,
    rejections: bookings
      .filter((b) => b.status === "rejected")
      .map((b) => b.rejectionReason ?? ""),
  };
}
