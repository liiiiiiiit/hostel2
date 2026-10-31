import { z } from 'zod';
const short = z.string().trim().max(500);
const long = z.string().max(10000);
export const localizedPropertyText = z.object({ fa: long, en: long, ru: long, hy: long });
const id = z.string().trim().min(1).max(200);
const money = z.number().int().min(0).max(1_000_000_000);
const count = z.number().int().min(0).max(1000);
export const imageUrl = z.string().max(2000).refine(value => /^\/api\/app\?media=[a-f0-9-]+$/.test(value) || /^https:\/\//.test(value) && URL.canParse(value));
const image = z.object({ id, url: imageUrl, alt: localizedPropertyText, roomTypeId: id.optional() });
const status = z.enum(['draft','published','hidden','archived']);
const base = {
  id, slug: z.string().trim().max(200).refine(value => !value || /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value)),
  description: localizedPropertyText.optional(), city: short, photos: z.array(imageUrl).max(60), media: z.array(image).max(60).optional(),
  publicPreview: z.boolean().optional(), factsConfirmed: z.boolean().optional(), sampleContent: z.boolean().optional(), createdAt: short, updatedAt: short,
};
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
const pricingRules=z.object({minimumNights:z.number().int().min(1).max(90),weekendDays:z.array(z.number().int().min(0).max(6)).max(7),weekendPriceAMD:money.optional(),overrides:z.array(z.object({id,from:calendarDate,to:calendarDate,priceAMD:money}).refine(rate=>rate.to>rate.from)).max(100),weeklyDiscountPercent:z.number().min(0).max(100),monthlyDiscountPercent:z.number().min(0).max(100)});
export const hostelSchema = z.object({
  ...base, optionalServices:z.array(z.object({id,name:localizedPropertyText,priceAMD:money,unit:z.enum(['stay','night','guest_night']),active:z.boolean()})).max(30).optional(),cancellationRule:z.object({freeBeforeHours:z.number().int().min(0).max(8760),penaltyPercent:z.number().min(0).max(100)}).optional(),commissionRule:z.object({type:z.enum(['none','percent','fixed']),value:z.number().min(0).max(1000000000),appliesOn:z.enum(['confirmed','completed'])}).refine(rule=>rule.type==='percent'?rule.value<=100:Number.isInteger(rule.value)).optional(),responseMinutes:z.number().int().min(15).max(1440).optional(), name: localizedPropertyText, listingStatus: status.optional(), address: localizedPropertyText,
  district: short, addressArmenianForTaxi: short, coordinates: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }), coordinatesProvided: z.boolean().optional(),
  phone: short, whatsapp: short.optional(), telegram: short.optional(), email: z.union([z.literal(''),z.email()]),
  entrancePhoto: z.union([z.literal(''),imageUrl]).optional(), directionsFa: long, directionsHy: long, directionsEn:long.optional(),directionsRu:long.optional(), floorAndDoorCode: short.optional(),
  nearMetro: z.boolean().optional(), monthlyStayAvailable: z.boolean().optional(), minPricePerNightAMD: money,
  reception24h: z.boolean(), receptionOpenTime: short.optional(), receptionCloseTime: short.optional(), checkInStandardTime: short, checkOutStandardTime: short,
  earlyCheckInAvailable: z.boolean(), earlyCheckInFeeAMD: money, lateArrivalAvailable: z.boolean(), lateArrivalFeeAMD: money,
  immediateStayEnabled: z.boolean(), immediateStayExpiresAt: short.optional(), freeLuggageStorage: z.boolean(), waitingLoungeAvailable: z.boolean(),
  languagesSpoken: z.array(z.enum(['fa','en','ru','hy'])).max(4),
  amenities: z.object({ wifi: z.boolean(), lockers: z.boolean(), requiresPersonalPadlock: z.boolean(), kitchen: z.boolean(), hotWater24h: z.boolean(), linenIncluded: z.boolean(), elevator: z.boolean(), stairsCount: count.optional(), airConditioning: z.boolean(), breakfastAvailable: z.boolean(), breakfastPriceAMD: money.optional(), laundry: z.boolean(), coworking: z.boolean() }),
  rules: z.object({ quietHours: short, smokingAllowed: z.boolean(), petsAllowed: z.boolean(), cancellationPolicy: long, cancellationPolicyLocalized: localizedPropertyText.optional(), acceptedPaymentMethodsOnArrival: z.array(short).max(20) }),
  roomTypes: z.array(z.object({ pricingRules:pricingRules.optional(), id, name: localizedPropertyText, description: localizedPropertyText, type: z.enum(['dorm_mixed','dorm_female','dorm_male','private']), bookingUnit: z.enum(['bed','room']).optional(), maxGuestsPerUnit: z.number().int().min(1).max(30).optional(), physicalUnits: z.array(z.object({ id, label: short })).max(1000).optional(), totalBedsOrRooms: count, pricePerNightAMD: money, hasCurtain: z.boolean().optional(), hasBedsidePlug: z.boolean().optional(), hasPersonalLocker: z.boolean().optional(), requiresOwnLock: z.boolean().optional() })).max(50),
  isPublished: z.boolean(),
});
export const rentalSchema = z.object({
  ...base, title: localizedPropertyText, propertyType: z.enum(['apartment','house','studio','villa']), rentalType: z.enum(['both','short_term','long_term']),
  neighborhood: short, approximateLocationLabel: short, addressPublic: short, addressExactInternal: long,
  areaSqm: z.number().min(0).max(100000), floor: z.number().int().min(-5).max(200), totalFloors: count,
  hasElevator: z.boolean(), bedroomsCount: count, bedsCount: count, bathroomsCount: count, maxResidents: count, isFurnished: z.boolean(),
  pricePerNightAMD: money.optional(), pricePerMonthAMD: money.optional(), minStayNights: count.optional(), minStayMonths: count.optional(),
  refundableDepositAMD: money, depositTerms: long, commissionType: z.enum(['none_direct','standard_commission']), commissionAmountText: long, cleaningFeeAMD: money,
  utilitiesBreakdown: z.object({ electricity: z.enum(['tenant','included','meter_reading']), water: z.enum(['tenant','included']), gas: z.enum(['tenant','included','meter_reading']), internet: z.enum(['included','tenant']), buildingMaintenance: z.enum(['included','tenant']) }),
  amenities: z.object({ wifi:z.boolean(),ac:z.boolean(),centralHeating:z.boolean(),washingMachine:z.boolean(),dishwasher:z.boolean(),balcony:z.boolean(),parking:z.boolean(),petFriendly:z.boolean() }),
  verifiedBadge:z.boolean(),verifiedExplanation:long,providerType:z.enum(['direct_owner','authorized_agent']),landlordInternalNotes:long,status,lastCheckedAt:short,
});
