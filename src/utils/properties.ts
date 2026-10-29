import type { AppLanguage, Hostel, RentalProperty, RoomType } from '../types/index.js';
export const propertyLanguages: AppLanguage[] = ['fa', 'en', 'ru', 'hy'];
export const emptyTranslation = () => ({ fa: '', en: '', ru: '', hy: '' });
export function newRoom(): RoomType {
  return { id: crypto.randomUUID(), name: emptyTranslation(), description: emptyTranslation(), type: 'dorm_mixed', bookingUnit: 'bed', maxGuestsPerUnit: 1, totalBedsOrRooms: 0, pricePerNightAMD: 0, physicalUnits: [] };
}
export function newHostel(): Hostel {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), slug: '', name: emptyTranslation(), description: emptyTranslation(), address: emptyTranslation(), city: '', district: '', addressArmenianForTaxi: '', coordinates: { lat: 0, lng: 0 }, coordinatesProvided: false, phone: '', email: '', photos: [], media: [], directionsFa: '', directionsHy: '', minPricePerNightAMD: 0, reception24h: false, receptionOpenTime: '', receptionCloseTime: '', checkInStandardTime: '', checkOutStandardTime: '', earlyCheckInAvailable: false, earlyCheckInFeeAMD: 0, lateArrivalAvailable: false, lateArrivalFeeAMD: 0, immediateStayEnabled: false, freeLuggageStorage: false, waitingLoungeAvailable: false, languagesSpoken: [], amenities: { wifi: false, lockers: false, requiresPersonalPadlock: false, kitchen: false, hotWater24h: false, linenIncluded: false, elevator: false, airConditioning: false, breakfastAvailable: false, laundry: false, coworking: false }, rules: { quietHours: '', smokingAllowed: false, petsAllowed: false, cancellationPolicy: '', acceptedPaymentMethodsOnArrival: [] }, roomTypes: [], isPublished: false, listingStatus: 'draft', factsConfirmed: false, sampleContent: false, createdAt: now, updatedAt: now };
}
export function newRental(): RentalProperty {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), slug: '', title: emptyTranslation(), description: emptyTranslation(), propertyType: 'apartment', rentalType: 'short_term', city: '', neighborhood: '', approximateLocationLabel: '', addressPublic: '', addressExactInternal: '', photos: [], media: [], areaSqm: 0, floor: 0, totalFloors: 0, hasElevator: false, bedroomsCount: 0, bedsCount: 0, bathroomsCount: 0, maxResidents: 0, isFurnished: false, refundableDepositAMD: 0, depositTerms: '', commissionType: 'none_direct', commissionAmountText: '', cleaningFeeAMD: 0, utilitiesBreakdown: { electricity: 'tenant', water: 'tenant', gas: 'tenant', internet: 'tenant', buildingMaintenance: 'tenant' }, amenities: { wifi: false, ac: false, centralHeating: false, washingMachine: false, dishwasher: false, balcony: false, parking: false, petFriendly: false }, verifiedBadge: false, verifiedExplanation: '', providerType: 'direct_owner', landlordInternalNotes: '', status: 'draft', lastCheckedAt: '', factsConfirmed: false, sampleContent: false, createdAt: now, updatedAt: now };
}
export type PublicationIssue = 'translations' | 'arrival' | 'address' | 'coordinates' | 'contact' | 'reception' | 'policies' | 'rooms' | 'photos' | 'review' | 'rentalDetails' | 'rentalPrices';
const translated = (value?: Record<AppLanguage, string>) => !!value && propertyLanguages.every(lang => value[lang]?.trim());
const time = (value?: string) => !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function publicationIssues(value: Hostel | RentalProperty): PublicationIssue[] {
  const issues: PublicationIssue[] = [];
  if (!translated('name' in value ? value.name : value.title) || !translated(value.description)) issues.push('translations');
  // Public previews require descriptive content, but never advertise bookable inventory.
  if (value.publicPreview) {
    if (!value.city.trim()) issues.push('address');
    if (!value.sampleContent || value.factsConfirmed) issues.push('review');
    return issues;
  }
  if (!value.photos.length || !value.media?.length || value.media.some(image => !translated(image.alt))) issues.push('photos');
  if (!value.factsConfirmed || value.sampleContent) issues.push('review');
  if ('roomTypes' in value) {
    if(![value.directionsFa,value.directionsEn,value.directionsRu,value.directionsHy].every(text=>text?.trim()))issues.push('arrival');
    if (!value.city.trim() || !translated(value.address) || !value.addressArmenianForTaxi.trim()) issues.push('address');
    if (value.coordinatesProvided === false || !Number.isFinite(value.coordinates.lat) || Math.abs(value.coordinates.lat) > 90 || !Number.isFinite(value.coordinates.lng) || Math.abs(value.coordinates.lng) > 180) issues.push('coordinates');
    if (!value.phone.trim() || !value.languagesSpoken.length) issues.push('contact');
    if (!time(value.checkInStandardTime) || !time(value.checkOutStandardTime) || (!value.reception24h && (!time(value.receptionOpenTime) || !time(value.receptionCloseTime)))) issues.push('reception');
    if (!value.cancellationRule||!value.responseMinutes||value.optionalServices?.some(service=>service.active&&!translated(service.name))||!translated(value.rules.cancellationPolicyLocalized) || !value.rules.acceptedPaymentMethodsOnArrival.length) issues.push('policies');
    if (!value.roomTypes.length || value.roomTypes.some(room => !translated(room.name) || !translated(room.description) || room.totalBedsOrRooms < 1 || room.pricePerNightAMD < 1 || !room.maxGuestsPerUnit || room.bookingUnit !== (room.type === 'private' ? 'room' : 'bed') || (room.type !== 'private' && room.maxGuestsPerUnit !== 1) || room.physicalUnits?.length !== room.totalBedsOrRooms || room.physicalUnits.some(unit => !unit.label.trim()) || new Set(room.physicalUnits.map(unit => unit.label)).size !== room.totalBedsOrRooms)) issues.push('rooms');
  } else {
    if (!value.city.trim() || !value.addressPublic.trim() || !value.approximateLocationLabel.trim()) issues.push('address');
    if (value.areaSqm <= 0 || value.maxResidents < 1 || value.bedsCount < 1 || value.bathroomsCount < 1 || value.totalFloors < value.floor || !value.depositTerms.trim()) issues.push('rentalDetails');
    if ((value.rentalType !== 'long_term' && (!value.pricePerNightAMD || !value.minStayNights)) || (value.rentalType !== 'short_term' && (!value.pricePerMonthAMD || !value.minStayMonths)) || (value.commissionType === 'standard_commission' && !value.commissionAmountText.trim())) issues.push('rentalPrices');
  }
  return issues;
}
