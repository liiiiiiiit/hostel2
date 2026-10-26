import { z } from "zod";
import type { Store, AppStoreState } from "./domain.js";
import type { Booking, ActionResult } from "../src/types/index.js";
import {
  calculateBookingPrice,
  calculateNights,
  areDatesOverlapping,
  peakBookedQuantity,
} from "../src/utils/pricing.js";
import { requiredUnits, occupancyIsValid } from "../src/utils/occupancy.js";
import { yerevanToday, addCalendarDays } from "../src/utils/dates.js";
const id = z.string().min(1).max(500),
  reason = z.string().trim().min(1).max(2000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
  );
export const operationSchemas = {
  updatePlatformSettings: z.tuple([
    z.object({
      emergencyHotline: z.string().max(100),
      telegramSupport: z.string().max(100),
      supportHours: z.object({
        fa: z.string().max(1000),
        en: z.string().max(1000),
        ru: z.string().max(1000),
        hy: z.string().max(1000),
      }),
    }),
  ]),
  recordExternalBooking: z.tuple([
    z.object({
      hostelId: id,
      roomTypeId: id,
      guestName: reason,
      guestContact: reason,
      contactType: z.enum(["email", "phone"]),
      checkIn: date,
      checkOut: date,
      guestsCount: z.number().int().min(1).max(100),
      quantity: z.number().int().min(1).max(100),
      source: z.enum(["walk_in", "telephone", "external"]),
      idempotencyKey: z.uuid(),
      acceptedTerms: z.literal(true),
      reason,
    }),
  ]),
  assignUnits: z.tuple([id, z.array(id).min(1).max(100)]),
  blockUnits: z.tuple([
    z.object({
      hostelId: id,
      roomTypeId: id,
      unitIds: z.array(id).min(1).max(100),
      from: date,
      to: date,
      reason,
    }),
  ]),
  releaseUnitBlock: z.tuple([id, reason]),
  recordStayEvent: z.tuple([
    id,
    z.enum(["check_in", "check_out", "no_show"]),
    reason,
  ]),
  requestBookingChange: z.tuple([
    id,
    z.object({
      checkIn: date,
      checkOut: date,
      guestsCount: z.number().int().min(1).max(100),
      quantity:z.number().int().min(1).max(100).optional(),
      reason,
    }),
  ]),
  acceptBookingChange: z.tuple([id, id]),
  applyBookingChange: z.tuple([id, reason]),
  rejectBookingChange: z.tuple([id, reason]),
  createSupportThread: z.tuple([
    id,
    z.enum(["arrival", "change", "question"]),
    reason,
  ]),
  replySupportThread: z.tuple([id, id, reason]),
  resolveSupportThread: z.tuple([id, id, z.enum(["open", "resolved"]), reason]),
  recordFinanceEntry: z.tuple([
    id,
    z.enum(["property_payment", "settlement", "adjustment"]),
    z.number().int().min(-1_000_000_000).max(1_000_000_000),
    reason,
    z.uuid(),
  ]),
  mergeSavedPlaces: z.tuple([
    z.array(z.string().regex(/^(hostel|rental):[^:]+$/)).max(100),
  ]),
  toggleAccountSaved: z.tuple([z.string().regex(/^(hostel|rental):[^:]+$/)]),
  claimGuestBooking: z.tuple([id]),
};
const deny = () => {
  throw new Error("دسترسی مجاز نیست.");
};
export const manages = (state: AppStoreState, hostelId: string) =>
  !!state.currentUser?.isActive &&
  (state.currentUser.role === "admin" ||
    (state.currentUser.role === "hostel_manager" &&
      !!state.currentUser.assignedHostelIds?.includes(hostelId)));
export function authorizedBooking(state: AppStoreState, identifier: string) {
  const booking = state.bookings.find(
    (b) => b.id === identifier || b.privateToken === identifier,
  );
  if (
    !booking ||
    !(
      manages(state, booking.hostelId) ||
      (!!state.currentUser &&
        state.currentUser.id === booking.travelerUserId) ||
      identifier === booking.privateToken
    )
  )
    return deny();
  return booking;
}
function record(
  state: AppStoreState,
  b: Booking,
  action: string,
  reason: string,
) {
  b.history ??= [];
  b.history.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorId: state.currentUser?.id ?? "guest",
    action,
    reason,
  });
  b.updatedAt = new Date().toISOString();
  if (!action.startsWith("finance_")) b.versionToken = crypto.randomUUID();
}
function assertDates(from: string, to: string, earliest=addCalendarDays(yerevanToday(),-1)) {
  if (
    calculateNights(from, to) < 1 ||
    calculateNights(from, to) > 90 ||
    from < earliest ||
    to > addCalendarDays(yerevanToday(), 89)
  )
    throw new Error("تاریخ اقامت معتبر نیست.");
}
function unitsAvailable(
  state: AppStoreState,
  b: Booking,
  ids: string[],
  from = b.checkIn,
  to = b.checkOut,
) {
  const room = state.hostels
    .find((h) => h.id === b.hostelId)
    ?.roomTypes.find((r) => r.id === b.roomTypeId);
  if (
    !room ||
    ids.length !== b.quantity ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !room.physicalUnits?.some((unit) => unit.id === id))
  )
    throw new Error("تعداد یا شناسه واحدهای واقعی معتبر نیست.");
  if (
    state.bookings.some(
      (other) =>
        other.id !== b.id &&
        other.hostelId === b.hostelId &&
        other.status === "confirmed" &&
        areDatesOverlapping(from, to, other.checkIn, other.checkOut) &&
        other.assignedUnitIds?.some((id) => ids.includes(id)),
    ) ||
    (state.unitBlocks ?? []).some(
      (block) =>
        !block.releasedAt &&
        block.hostelId === b.hostelId &&
        areDatesOverlapping(from, to, block.from, block.to) &&
        block.unitIds.some((id) => ids.includes(id)),
    )
  )
    throw new Error("واحد انتخاب‌شده در این تاریخ اشغال یا مسدود است.");
}
export async function operate(
  store: Store,
  action: keyof typeof operationSchemas,
  args: unknown[],
): Promise<ActionResult> {
  const state = store.getState();
  const actor = state.currentUser;
  if (action === "updatePlatformSettings") {
    if (actor?.role !== "admin") return deny();
    Object.assign(state.settings, args[0]);
    state.settings.supportWorkingHoursFa =
      state.settings.supportHours?.fa ?? "";
    return { success: true };
  }
  if (action === "mergeSavedPlaces" || action === "toggleAccountSaved") {
    if (!actor) return deny();
    state.savedPlaces ??= {};
    const previous = state.savedPlaces[actor.id] ?? [];
    state.savedPlaces[actor.id] =
      action === "mergeSavedPlaces"
        ? [...new Set([...previous, ...(args[0] as string[])])].slice(0, 100)
        : previous.includes(String(args[0]))
          ? previous.filter((key) => key !== args[0])
          : [...previous, String(args[0])].slice(0, 100);
    return { success: true };
  }
  if (action === "claimGuestBooking") {
    if (!actor || !actor.emailVerifiedAt) return deny();
    const b = state.bookings.find((b) => b.privateToken === args[0]);
    if (!b || (b.travelerUserId && b.travelerUserId !== actor.id))
      return deny();
    b.travelerUserId = actor.id;
    record(state, b, "claimed", "Private tracking token and verified account");
    return { success: true };
  }
  if (action === "recordExternalBooking") {
    const input = args[0] as z.infer<
      typeof operationSchemas.recordExternalBooking
    >[0];
    if (!manages(state, input.hostelId)) return deny();
    assertDates(input.checkIn, input.checkOut);
    const created = store.createBooking(input);
    if (!created.success || !created.booking)
      throw new Error(created.error ?? "درخواست انجام نشد.");
    if(created.booking.status!=="pending")return created;
    const confirmed = store.updateBookingStatus(
      created.booking.id,
      "confirmed",
      input.reason,
    );
    if (!confirmed.success)
      throw new Error(confirmed.error ?? "ظرفیت کافی نیست.");
    record(state, created.booking, "external", input.reason);
    return created;
  }
  if (action === "blockUnits") {
    const input = args[0] as z.infer<typeof operationSchemas.blockUnits>[0];
    if (!manages(state, input.hostelId)) return deny();
    assertDates(input.from, input.to);
    const mock = {
      hostelId: input.hostelId,
      roomTypeId: input.roomTypeId,
      quantity: input.unitIds.length,
      id: "new-block",
      checkIn: input.from,
      checkOut: input.to,
    } as Booking;
    unitsAvailable(state, mock, input.unitIds);
    if (
      store.remainingCapacity(
        input.hostelId,
        input.roomTypeId,
        input.from,
        input.to,
      ) < input.unitIds.length
    )
      throw new Error("ظرفیت مسدودسازی با رزروهای موجود سازگار نیست.");
    state.unitBlocks!.push({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  }
  if (action === "releaseUnitBlock") {
    const block = state.unitBlocks!.find((b) => b.id === args[0]);
    if (!block || !manages(state, block.hostelId)) return deny();
    block.releasedAt = new Date().toISOString();
    block.reason += " / " + args[1];
    return { success: true };
  }
  if (action === "assignUnits" || action === "recordStayEvent") {
    const b = authorizedBooking(state, String(args[0]));
    if (!manages(state, b.hostelId)) return deny();
    if (b.status !== "confirmed") throw new Error("رزرو باید تأیید شده باشد.");
    if (action === "assignUnits") {
      unitsAvailable(state, b, args[1] as string[]);
      b.assignedUnitIds = args[1] as string[];
      record(state, b, "assigned", "Physical units assigned");
      return { success: true };
    }
    const event = String(args[1]);
    if (event === "check_in") {
      if (
        b.checkIn > yerevanToday() ||
        b.checkOut <= yerevanToday() ||
        b.checkedInAt
      )
        throw new Error("تاریخ یا وضعیت ورود معتبر نیست.");
      unitsAvailable(state, b, b.assignedUnitIds ?? []);
      if(state.bookings.some(other=>other.id!==b.id&&other.hostelId===b.hostelId&&other.status==="confirmed"&&other.checkedInAt&&!other.checkedOutAt&&other.assignedUnitIds?.some(id=>b.assignedUnitIds?.includes(id))))throw new Error("واحد انتخاب‌شده در این تاریخ اشغال یا مسدود است.");
      b.checkedInAt = new Date().toISOString();
    } else if (event === "check_out") {
      if (!b.checkedInAt || b.checkedOutAt)
        throw new Error("ابتدا ورود مهمان را ثبت کنید.");
      b.checkedOutAt = new Date().toISOString();
      const changed = store.updateBookingStatus(
        b.id,
        "completed",
        String(args[2]),
      );
      if (!changed.success) throw new Error(changed.error);
    } else {
      if (b.checkedInAt || b.checkIn > yerevanToday())
        throw new Error("وضعیت عدم حضور معتبر نیست.");
      const changed = store.updateBookingStatus(
        b.id,
        "no_show",
        String(args[2]),
      );
      if (!changed.success) throw new Error(changed.error);
    }
    record(state, b, event, String(args[2]));
    return { success: true };
  }
  if (action === "requestBookingChange") {
    const b = authorizedBooking(state, String(args[0]));
    const input = args[1] as z.infer<
      typeof operationSchemas.requestBookingChange
    >[1];
    if (!["pending", "confirmed"].includes(b.status))
      throw new Error("رزرو فعال نیست.");
    assertDates(input.checkIn,input.checkOut,input.checkIn===b.checkIn?b.checkIn:undefined);
    const hostel = state.hostels.find((h) => h.id === b.hostelId)!,
      room = hostel.roomTypes.find((r) => r.id === b.roomTypeId)!;
    const quantity=input.quantity??(input.guestsCount===b.guestsCount?b.quantity:requiredUnits(room,input.guestsCount));
    if (
      !quantity || !occupancyIsValid(room,input.guestsCount,quantity) ||
      (b.checkedInAt &&
        (input.checkIn !== b.checkIn || quantity !== b.quantity))
    )
      throw new Error("تغییر با اقامت فعال سازگار نیست.");
    const others = state.bookings.filter(
      (other) =>
        other.id !== b.id &&
        other.hostelId === b.hostelId &&
        other.roomTypeId === b.roomTypeId &&
        other.status === "confirmed",
    );
    if (
      store.remainingCapacity(
        b.hostelId,
        b.roomTypeId,
        input.checkIn,
        input.checkOut,
        others,
      ) < quantity
    )
      throw new Error("ظرفیت کافی نیست.");
    const services = (b.agreement?.optionalServices ?? []).map((service) => ({
      ...service,
      amountAMD:
        service.unitPriceAMD === undefined
          ? service.amountAMD
          : service.unitPriceAMD *
            (service.unit === "stay"
              ? 1
              : service.unit === "night"
                ? calculateNights(input.checkIn, input.checkOut)
                : calculateNights(input.checkIn, input.checkOut) *
                  input.guestsCount),
    }));
    const serviceFee = services.reduce(
      (sum, service) => sum + service.amountAMD,
      0,
    );
    const quote = calculateBookingPrice({
      pricePerNight: room.pricePerNightAMD,
      quantity,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rules: room.pricingRules,
      discountPercent: b.discountPercent,
      earlyCheckInFee: b.earlyCheckInFeeAMD,
      lateCheckInFee: b.lateCheckInFeeAMD,
      extraServicesFee: serviceFee,
    });
    if (!quote.isValidDates || !b.agreement)
      throw new Error("برای این رزرو امکان محاسبه تغییر وجود ندارد.");
    const proposal = {
      id: crypto.randomUUID(),
      bookingId: b.id,
      ...input,
      quantity,
      amountAMD: quote.finalAmountToPayOnArrival,
      differenceAMD: quote.finalAmountToPayOnArrival - b.finalAmountAMD,
      pricing: {
        ...structuredClone(b.agreement),
        discountPercent: quote.discountPercent,
        discountSource: quote.discountSource,
        optionalServices: services,
        nightlyPriceAMD: room.pricePerNightAMD,
        nightlyLines: quote.nightlyLines,
        breakdown: {
          ...b.agreement.breakdown,
          accommodationAMD: quote.baseAmount,
          discountAMD: quote.discountAmount,
          optionalServicesAMD: serviceFee,
          totalAMD: quote.finalAmountToPayOnArrival,
        },
      },
      bookingVersion: b.versionToken ?? b.updatedAt,
      propertyVersion: hostel.updatedAt,
      requestedBy: actor?.id ?? "guest",
      createdAt: new Date().toISOString(),
      status: "proposed" as const,
    };
    state.bookingChanges!.push(proposal);
    return { success: true, proposal };
  }
  if (
    action === "acceptBookingChange" ||
    action === "applyBookingChange" ||
    action === "rejectBookingChange"
  ) {
    const proposal = state.bookingChanges!.find((p) => p.id === args[0]);
    if (!proposal) throw new Error("پیشنهاد یافت نشد.");
    const b = state.bookings.find((b) => b.id === proposal.bookingId)!;
    if (action === "acceptBookingChange") {
      if (
        !(
          String(args[1]) === b.privateToken ||
          (!!actor && actor.id === b.travelerUserId)
        )
      )
        return deny();
      if (proposal.status !== "proposed")
        throw new Error("وضعیت پیشنهاد معتبر نیست.");
      proposal.status = "accepted";
      proposal.guestAcceptedAt = new Date().toISOString();
      return { success: true };
    }
    if (!manages(state, b.hostelId)) return deny();
    if (action === "rejectBookingChange") {
      if (["applied", "rejected"].includes(proposal.status))
        throw new Error("وضعیت پیشنهاد معتبر نیست.");
      proposal.status = "rejected";
      record(state, b, "change_rejected", String(args[1]));
      return { success: true };
    }
    const hostel = state.hostels.find((h) => h.id === b.hostelId)!;
    if (
      proposal.status !== "accepted" ||
      (b.versionToken ?? b.updatedAt) !== proposal.bookingVersion ||
      hostel.updatedAt !== proposal.propertyVersion ||
      !["pending", "confirmed"].includes(b.status)
    )
      throw new Error("پیشنهاد تغییر کرده یا نیازمند پذیرش مسافر است.");
    const others = state.bookings.filter(
      (other) =>
        other.id !== b.id &&
        other.hostelId === b.hostelId &&
        other.roomTypeId === b.roomTypeId &&
        other.status === "confirmed",
    );
    if (
      store.remainingCapacity(
        b.hostelId,
        b.roomTypeId,
        proposal.checkIn,
        proposal.checkOut,
        others,
      ) < proposal.quantity
    )
      throw new Error("ظرفیت کافی نیست.");
    if (b.assignedUnitIds?.length && b.quantity === proposal.quantity)
      unitsAvailable(
        state,
        b,
        b.assignedUnitIds,
        proposal.checkIn,
        proposal.checkOut,
      );
    else b.assignedUnitIds = [];
    b.checkIn = proposal.checkIn;
    b.checkOut = proposal.checkOut;
    b.nights = calculateNights(b.checkIn, b.checkOut);
    b.guestsCount = proposal.guestsCount;
    b.quantity = proposal.quantity;
    b.finalAmountAMD = proposal.amountAMD;
    b.baseAmountAMD = proposal.pricing.breakdown.accommodationAMD;
    b.discountAmountAMD = proposal.pricing.breakdown.discountAMD;
    b.extraServicesFeeAMD = proposal.pricing.breakdown.optionalServicesAMD;
    b.discountPercent = proposal.pricing.discountPercent ?? b.discountPercent;
    if (b.couponCode && proposal.pricing.discountSource !== "coupon") {
      const coupon = state.coupons.find((c) => c.code === b.couponCode);
      if (coupon) coupon.usedCount = Math.max(0, coupon.usedCount - 1);
      b.couponCode = undefined;
    }
    b.agreement = structuredClone(proposal.pricing);
    b.agreement.acceptedAt = proposal.guestAcceptedAt!;
    proposal.status = "applied";
    record(state, b, "change_applied", String(args[1]));
    return { success: true };
  }
  if (action === "recordFinanceEntry") {
    const b = authorizedBooking(state, String(args[0]));
    if (
      !manages(state, b.hostelId) ||
      (args[1] !== "property_payment" && actor?.role !== "admin")
    )
      return deny();
    const previous = state.financeEntries!.find(
      (entry) => entry.requestId === args[4],
    );
    if (previous) {
      if (
        previous.bookingId !== b.id ||
        previous.kind !== args[1] ||
        previous.amountAMD !== args[2] ||
        previous.reason !== args[3]
      )
        throw new Error("شناسه درخواست تکراری است.");
      return { success: true };
    }
    const amount = Number(args[2]);
    if (
      amount === 0 ||
      (args[1] !== "adjustment" &&
        state
          .financeEntries!.filter(
            (entry) => entry.bookingId === b.id && entry.kind === args[1],
          )
          .reduce((sum, entry) => sum + entry.amountAMD, 0) +
          amount <
          0)
    )
      throw new Error("مبلغ معتبر نیست.");
    state.financeEntries!.push({
      id: crypto.randomUUID(),
      bookingId: b.id,
      hostelId: b.hostelId,
      kind: args[1] as "property_payment" | "settlement" | "adjustment",
      amountAMD: amount,
      reason: String(args[3]),
      requestId: String(args[4]),
      actorId: actor!.id,
      createdAt: new Date().toISOString(),
    });
    record(state, b, "finance_" + args[1], String(args[3]));
    return { success: true };
  }
  if (action === "createSupportThread") {
    const b = authorizedBooking(state, String(args[0]));
    const now = new Date().toISOString();
    const thread = {
      id: crypto.randomUUID(),
      bookingId: b.id,
      category: args[1] as "arrival" | "change" | "question",
      status: "open" as const,
      messages: [
        {
          id: crypto.randomUUID(),
          at: now,
          actorId: actor?.id ?? "guest",
          role: actor?.role ?? "guest",
          text: String(args[2]),
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    state.supportThreads!.push(thread);
    if (thread.category === "arrival") {
      b.entranceIssueReported = true;
      b.entranceIssueNote = String(args[2]);
    }
    return { success: true, thread };
  }
  if (action === "replySupportThread" || action === "resolveSupportThread") {
    const thread = state.supportThreads!.find((t) => t.id === args[0]);
    if (!thread) throw new Error("درخواست یافت نشد.");
    const b = authorizedBooking(state, String(args[1]));
    if (b.id !== thread.bookingId) return deny();
    const now = new Date().toISOString();
    if (action === "replySupportThread") {
      thread.messages.push({
        id: crypto.randomUUID(),
        at: now,
        actorId: actor?.id ?? "guest",
        role: actor?.role ?? "guest",
        text: String(args[2]),
      });
    } else {
      if (!manages(state, b.hostelId)) return deny();
      thread.status = args[2] as "open" | "resolved";
      if (thread.category === "arrival")
        b.entranceIssueReported = state.supportThreads!.some(item=>item.bookingId===b.id&&item.category==="arrival"&&item.status==="open");
      thread.messages.push({
        id: crypto.randomUUID(),
        at: now,
        actorId: actor!.id,
        role: actor!.role,
        text: String(args[3]),
      });
    }
    thread.updatedAt = now;
    return { success: true, thread };
  }
  throw new Error("درخواست معتبر نیست.");
}
