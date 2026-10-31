import type { Hostel, RentalProperty, RoomType } from "../types/index.js";
import { requiredUnits } from "./occupancy.js";
import { calculateBookingPrice, calculateNights } from "./pricing.js";
export function compareHostel(
  hostel: Hostel,
  input: { checkIn: string; checkOut: string; guests: number; type: string },
  available: (room: RoomType) => number,
) {
  if (hostel.publicPreview) return undefined;
  const offers = hostel.roomTypes.flatMap((room) => {
    const units = requiredUnits(room, input.guests);
    if (
      units === null ||
      (input.type !== "all" && room.type !== input.type) ||
      available(room) < units
    )
      return [];
    const quote = calculateBookingPrice({
      pricePerNight: room.pricePerNightAMD,
      quantity: units,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rules: room.pricingRules,
    });
    return quote.isValidDates
      ? [
          {
            room,
            units,
            total: quote.finalAmountToPayOnArrival,
            nightly: quote.finalAmountToPayOnArrival / quote.nights,
          },
        ]
      : [];
  });
  return offers.sort((a, b) => a.total - b.total)[0];
}
export function compareRental(
  rental: RentalProperty,
  input: { checkIn: string; checkOut: string; guests: number; type?: string },
) {
  if (rental.publicPreview) return undefined;
  const nights = calculateNights(input.checkIn, input.checkOut);
  if (input.type && input.type !== "all" && input.type !== "private")
    return undefined;
  if (
    !rental.pricePerNightAMD ||
    rental.rentalType === "long_term" ||
    input.guests > rental.maxResidents ||
    nights < (rental.minStayNights ?? 1)
  )
    return undefined;
  return {
    total: rental.pricePerNightAMD * nights + rental.cleaningFeeAMD,
    nightly: rental.pricePerNightAMD,
    deposit: rental.refundableDepositAMD,
    unknown:
      rental.commissionType !== "none_direct" ||
      Object.values(rental.utilitiesBreakdown).some(
        (value) => value !== "included",
      ),
  };
}
