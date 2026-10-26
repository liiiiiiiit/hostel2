import { Store } from './domain.js';
import { publicState } from './public-state.js';
export function readOnlyPreview() {
  const state = new Store(undefined, true).getState();
  state.users = []; state.credentials = {}; state.bookings = []; state.rentalInquiries = []; state.reviews = []; state.auditLogs = [];
  for (const hostel of state.hostels) { hostel.sampleContent = true; hostel.factsConfirmed = false; delete hostel.floorAndDoorCode; hostel.verification = { status: 'unverified' }; }
  for (const rental of state.rentals) { rental.sampleContent = true; rental.factsConfirmed = false; rental.verifiedBadge = false; rental.lastCheckedAt = ''; rental.verifiedExplanation = ''; }
  return { ...publicState(state, null, false), previewMode: true };
}
