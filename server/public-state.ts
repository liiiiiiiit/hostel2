import type { AppStoreState } from "./domain.js";
import type { ClientState, User } from "../src/types/index.js";
import { addCalendarDays, yerevanToday } from "../src/utils/dates.js";
import { peakBookedQuantity } from "../src/utils/pricing.js";

export function publicState(
  state: AppStoreState,
  actor: User | null,
  demoMode: boolean,
  bookingToken = "",
  inquiryToken = "",
  suppliedAvailability?: ClientState["availability"],
): ClientState {
  const admin = actor?.role === "admin";
  const manages = (id: string) =>
    admin ||
    (actor?.role === "hostel_manager" && actor.assignedHostelIds?.includes(id));
  const bookings = state.bookings.filter(
    (b) =>
      manages(b.hostelId) ||
      (actor && b.travelerUserId === actor.id) ||
      (bookingToken && b.privateToken === bookingToken),
  );
  const inquiries = state.rentalInquiries.filter(
    (i) => admin || (inquiryToken && i.privateToken === inquiryToken),
  );
  const hostels = state.hostels
    .filter(
      (h) =>
        h.isPublished ||
        manages(h.id) ||
        bookings.some((b) => b.hostelId === h.id),
    )
    .map((hostel) => {
      const copy = structuredClone(hostel);
      copy.locationVerification ??= { status: "unverified" };
      if (!manages(hostel.id) && copy.locationVerification) {
        delete copy.locationVerification.checkedBy;
      }
      if (
        !manages(hostel.id) &&
        !bookings.some(
          (b) =>
            b.hostelId === hostel.id &&
            (b.privateToken === bookingToken ||
              (actor && b.travelerUserId === actor.id)) &&
            b.status === "confirmed" &&
            b.checkIn <= yerevanToday() &&
            (b.checkOut > yerevanToday() ||
              (b.checkOut === yerevanToday() &&
                new Date().toLocaleTimeString("en-GB", {
                  timeZone: "Asia/Yerevan",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }) <
                  (b.agreement?.checkOutTime ?? hostel.checkOutStandardTime))),
        )
      )
        delete copy.floorAndDoorCode;
      if (!manages(hostel.id)) {
        for (const room of copy.roomTypes) delete room.physicalUnits;
      }
      return copy;
    });
  const availability: ClientState["availability"] = [];
  const start = addCalendarDays(yerevanToday(), -1);
  for (const hostel of (suppliedAvailability ? [] : hostels.filter(hostel => !hostel.publicPreview)))
    for (const room of hostel.roomTypes) {
      for (let offset = 0; offset < 91; offset++) {
        const date = addCalendarDays(start, offset);
        const capacity =
          state.capacities.find(
            (c) =>
              c.hostelId === hostel.id &&
              c.roomTypeId === room.id &&
              c.date === date,
          )?.capacity ?? room.totalBedsOrRooms;
        const booked = peakBookedQuantity(
          date,
          addCalendarDays(date, 1),
          state.bookings.filter(
            (b) =>
              b.hostelId === hostel.id &&
              b.roomTypeId === room.id &&
              b.status === "confirmed",
          ),
        );
        availability.push({
          hostelId: hostel.id,
          roomTypeId: room.id,
          date,
          capacity,
          booked,
          available: Math.max(
            0,
            capacity -
              booked -
              (state.unitBlocks ?? [])
                .filter(
                  (block) =>
                    !block.releasedAt &&
                    block.hostelId === hostel.id &&
                    block.roomTypeId === room.id &&
                    date >= block.from &&
                    date < block.to,
                )
                .reduce((sum, block) => sum + block.unitIds.length, 0),
          ),
        });
      }
    }
  const bookingIds = new Set(bookings.map((b) => b.id));
  return {
    unitBlocks: (state.unitBlocks ?? []).filter((block) =>
      manages(block.hostelId),
    ),
    bookingChanges: (state.bookingChanges ?? []).filter((change) =>
      bookingIds.has(change.bookingId),
    ),
    supportThreads: (state.supportThreads ?? []).filter((thread) =>
      bookingIds.has(thread.bookingId),
    ),
    financeEntries: (state.financeEntries ?? []).filter((entry) =>
      manages(entry.hostelId),
    ),
    savedPlaces: actor ? (state.savedPlaces?.[actor.id] ?? []) : [],
    currentUser: actor,
    demoMode,
    users: admin ? state.users : actor ? [actor] : [],
    hostels,
    rentals: state.rentals
      .filter((r) => admin || r.status === "published")
      .map((r) =>
        admin
          ? r
          : { ...r, addressExactInternal: "", landlordInternalNotes: "" },
      ),
    bookings: bookings.map(
      ({
        requestFingerprint: _fingerprint,
        idempotencyKey: _key,
        ...booking
      }) =>
        manages(booking.hostelId)
          ? booking
          : {
              ...booking,
              commissionRule:undefined,
              history: booking.history
                ?.filter((event) => !event.action.startsWith("finance_"))
                .map(({ actorId: _actor, ...event }) => ({
                  ...event,
                  actorId: "",
                })),
            },
    ),
    rentalInquiries: inquiries.map((inquiry) =>
      admin ? inquiry : { ...inquiry, adminNotes: undefined },
    ),
    coupons: state.coupons,
    reviews: state.reviews
      .filter((r) => admin || r.status === "approved")
      .map((r) =>
        admin
          ? r
          : { ...r, bookingId: "", guestName: r.guestName.split(" ")[0] },
      ),
    articles: state.articles.filter((a) => admin || a.status === "published"),
    phrases: state.phrases,
    auditLogs: admin ? state.auditLogs : [],
    capacities: state.capacities.filter((c) => manages(c.hostelId)),
    availability: suppliedAvailability ?? availability,
    settings: state.settings,
  };
}
