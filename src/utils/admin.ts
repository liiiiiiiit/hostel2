import type { Article, Booking, BookingStatus } from "../types";

/** Stable newest-first results; never mutate the shared API snapshot. */
export function selectAdminBookings(
  bookings: readonly Booking[],
  filters: {
    status?: BookingStatus | "all";
    query?: string;
    issuesOnly?: boolean;
    arrivalsOn?: string;
  },
) {
  const query = filters.query?.trim().toLocaleLowerCase() ?? "";
  return bookings
    .filter(
      (booking) =>
        (!filters.status ||
          filters.status === "all" ||
          booking.status === filters.status) &&
        (!filters.arrivalsOn || booking.checkIn === filters.arrivalsOn) &&
        (!filters.issuesOnly ||
          (booking.entranceIssueReported && booking.status === "confirmed")) &&
        (!query ||
          [
            booking.guestName,
            booking.guestContact,
            booking.hostelName,
            booking.trackingCode,
            booking.checkIn,
            booking.checkOut,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Reports deliberately exclude bearer links, door codes and internal state. */
export function bookingReport(bookings: readonly Booking[]) {
  return bookings.map(
    ({
      trackingCode,
      guestName,
      guestContact,
      hostelName,
      roomTypeName,
      checkIn,
      checkOut,
      quantity,
      guestsCount,
      finalAmountAMD,
      status,
    }) => ({
      trackingCode,
      guestName,
      guestContact,
      hostelName,
      roomTypeName,
      checkIn,
      checkOut,
      quantity,
      guestsCount,
      finalAmountAMD,
      status,
    }),
  );
}

export function uniqueArticleSlug(
  title: string,
  articles: readonly Pick<Article, "slug">[],
) {
  const base =
    title
      .trim()
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 450) || "guide";
  const existing = new Set(articles.map((article) => article.slug));
  let slug = base,
    index = 2;
  while (existing.has(slug)) slug = `${base}-${index++}`;
  return slug;
}
