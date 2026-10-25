import type { AppStoreState } from './domain.js';
import type { ClientState, User } from '../src/types/index.js';
import { addCalendarDays, yerevanToday } from '../src/utils/dates.js';
import { peakBookedQuantity } from '../src/utils/pricing.js';

export function publicState(state: AppStoreState, actor: User | null, demoMode: boolean, bookingToken = '', inquiryToken = ''): ClientState {
  const admin = actor?.role === 'admin';
  const manages = (id: string) => admin || (actor?.role === 'hostel_manager' && actor.assignedHostelIds?.includes(id));
  const bookings = state.bookings.filter(b => manages(b.hostelId) || (actor && b.travelerUserId === actor.id) || (bookingToken && b.privateToken === bookingToken));
  const inquiries = state.rentalInquiries.filter(i => admin || (inquiryToken && i.privateToken === inquiryToken));
  const hostels = state.hostels.filter(h => h.isPublished || manages(h.id) || bookings.some(b => b.hostelId === h.id)).map(hostel => {
    const copy = structuredClone(hostel);
    if (!manages(hostel.id) && !bookings.some(b => b.hostelId === hostel.id && b.privateToken === bookingToken && b.status === 'confirmed')) delete copy.floorAndDoorCode;
    return copy;
  });
  const availability: ClientState['availability'] = [];
  const start = yerevanToday();
  for (const hostel of hostels) for (const room of hostel.roomTypes) {
    for (let offset = 0; offset < 90; offset++) {
      const date = addCalendarDays(start, offset);
      const capacity = state.capacities.find(c => c.hostelId === hostel.id && c.roomTypeId === room.id && c.date === date)?.capacity ?? room.totalBedsOrRooms;
      const booked = peakBookedQuantity(date, addCalendarDays(date, 1), state.bookings.filter(b => b.hostelId === hostel.id && b.roomTypeId === room.id && b.status === 'confirmed'));
      availability.push({ hostelId: hostel.id, roomTypeId: room.id, date, capacity, booked, available: Math.max(0, capacity - booked) });
    }
  }
  return {
    currentUser: actor, demoMode, users: admin ? state.users : actor ? [actor] : [], hostels,
    rentals: state.rentals.filter(r => admin || r.status === 'published').map(r => admin ? r : { ...r, addressExactInternal: '', landlordInternalNotes: '' }),
    bookings, rentalInquiries: inquiries, coupons: state.coupons,
    reviews: state.reviews.filter(r => admin || r.status === 'approved').map(r => admin ? r : { ...r, bookingId: '', guestName: r.guestName.split(' ')[0] }),
    articles: state.articles.filter(a => admin || a.status === 'published'), phrases: state.phrases,
    auditLogs: admin ? state.auditLogs : [], capacities: state.capacities.filter(c => manages(c.hostelId)), availability, settings: state.settings,
  };
}
