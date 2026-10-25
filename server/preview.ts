import { Store } from './domain';
import { publicState } from './public-state';
export function readOnlyPreview() {
  const state = new Store(undefined, true).getState();
  state.users = []; state.credentials = {}; state.bookings = []; state.rentalInquiries = []; state.reviews = []; state.auditLogs = [];
  for (const hostel of state.hostels) { delete hostel.floorAndDoorCode; hostel.verification = { status: 'unverified' }; }
  for (const rental of state.rentals) { rental.verifiedBadge = false; rental.lastCheckedAt = ''; rental.verifiedExplanation = ''; }
  return { ...publicState(state, null, false), previewMode: true };
}
