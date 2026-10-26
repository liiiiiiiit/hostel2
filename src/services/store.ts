import { calculateNights } from '../utils/pricing';
import type { Store as DomainStore } from '../../server/domain';
import type { ActionResult, ClientState, Hostel } from '../types';

const emptyState: ClientState = { users: [], currentUser: null, hostels: [], rentals: [], coupons: [], bookings: [], rentalInquiries: [], reviews: [], articles: [], phrases: [], auditLogs: [], capacities: [], availability: [], demoMode: false, settings: { emergencyHotline: '', telegramSupport: '', supportWorkingHoursFa: '', immediateTimeoutMinutes: 30 } };
class ApiStore {
  private state = structuredClone(emptyState);
  private listeners = new Set<() => void>();
  private bookingToken = '';
  private inquiryToken = '';
  private revision = 0;
  private headers() { return { 'Content-Type': 'application/json', 'X-Requested-With': 'YerevanHub', 'X-App-Language': document.documentElement.lang || 'fa', 'X-Booking-Token': this.bookingToken, 'X-Inquiry-Token': this.inquiryToken }; }
  private apply(state: ClientState) { this.state = state; for (const listener of this.listeners) listener(); }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getState = () => this.state;
  getCurrentUser = () => this.state.currentUser;
  getHostels = () => this.state.hostels.filter(h => h.isPublished);
  getAllHostelsForAdmin = () => this.state.hostels;
  getHostelByIdOrSlug = (id: string) => this.state.hostels.find(h => h.id === id || h.slug === id);
  getRentals = (drafts = false) => this.state.rentals.filter(r => drafts || r.status === 'published');
  getRentalByIdOrSlug = (id: string) => this.state.rentals.find(r => r.id === id || r.slug === id);
  getArticles = (drafts = false) => this.state.articles.filter(a => drafts || a.status === 'published');
  getArticleBySlug = (id: string) => this.state.articles.find(a => a.id === id || a.slug === id);
  getPhrases = (category?: string) => this.state.phrases.filter(p => !category || category === 'all' || p.category === category);
  getBookingByToken = (token: string) => this.state.bookings.find(b => b.privateToken === token);
  getRentalInquiryByToken = (token: string) => this.state.rentalInquiries.find(i => i.privateToken === token);
  getHostelAverageRating = (id: string) => { const reviews = this.state.reviews.filter(r => r.hostelId === id && r.status === 'approved'); return { avg: reviews.length ? Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length * 10) / 10 : 0, count: reviews.length }; };
  async refresh() {
    const revision = ++this.revision;
    const response = await fetch('/api/app', { headers: this.headers(), credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok || !data.state) throw new Error(data.error || 'ارتباط با سرور برقرار نشد.');
    if (revision === this.revision) this.apply(data.state);
  }
  async track(bookingToken = '', inquiryToken = '') { this.bookingToken = bookingToken; this.inquiryToken = inquiryToken; await this.refresh(); }
  async action(action: string, args: unknown[]): Promise<ActionResult> {
    const revision = ++this.revision;
    try {
      const response = await fetch('/api/app', { method: 'POST', credentials: 'same-origin', headers: this.headers(), body: JSON.stringify({ action, args }) });
      const data = await response.json();
      if (data.state && revision === this.revision) this.apply(data.state);
      if (!response.ok) return { success: false, error: data.error || 'درخواست انجام نشد.' };
      return data;
    } catch { return { success: false, error: 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.' }; }
  }
  remainingCapacity(hostel: Hostel, roomId: string, checkIn: string, checkOut: string) {
    const days = this.state.availability.filter(day => day.hostelId === hostel.id && day.roomTypeId === roomId && day.date >= checkIn && day.date < checkOut);
    return days.length && days.length === calculateNights(checkIn, checkOut) ? Math.min(...days.map(day => day.available)) : 0;
  }
  login = (...args: Parameters<DomainStore['login']>) => this.action('login', args);
  logout = (...args: Parameters<DomainStore['logout']>) => this.action('logout', args);
  registerTraveler = (...args: Parameters<DomainStore['registerTraveler']>) => this.action('registerTraveler', args);
  createBooking = (...args: Parameters<DomainStore['createBooking']>) => this.action('createBooking', args);
  updateBookingStatus = (...args: Parameters<DomainStore['updateBookingStatus']>) => this.action('updateBookingStatus', args);
  cancelBookingByGuest = (...args: Parameters<DomainStore['cancelBookingByGuest']>) => this.action('cancelBookingByGuest', args);
  reportEntranceIssue = (...args: Parameters<DomainStore['reportEntranceIssue']>) => this.action('reportEntranceIssue', args);
  submitReview = (...args: Parameters<DomainStore['submitReview']>) => this.action('submitReview', args);
  createRentalInquiry = (...args: Parameters<DomainStore['createRentalInquiry']>) => this.action('createRentalInquiry', args);
  setCapacity = (...args: Parameters<DomainStore['setCapacity']>) => this.action('setCapacity', args);
  setVerification = (...args: Parameters<DomainStore['setVerification']>) => this.action('setVerification', args);
  saveHostel = (...args: Parameters<DomainStore['saveHostel']>) => this.action('saveHostel', args);
  saveRental = (...args: Parameters<DomainStore['saveRental']>) => this.action('saveRental', args);
  setHostelStatus = (...args: Parameters<DomainStore['setHostelStatus']>) => this.action('setHostelStatus', args);
  setRentalStatus = (...args: Parameters<DomainStore['setRentalStatus']>) => this.action('setRentalStatus', args);
  toggleHostelPublished = (...args: Parameters<DomainStore['toggleHostelPublished']>) => this.action('toggleHostelPublished', args);
  toggleRentalAvailability = (...args: Parameters<DomainStore['toggleRentalAvailability']>) => this.action('toggleRentalAvailability', args);
  createHostelManager = (...args: Parameters<DomainStore['createHostelManager']>) => this.action('createHostelManager', args);
  toggleManagerActive = (...args: Parameters<DomainStore['toggleManagerActive']>) => this.action('toggleManagerActive', args);
  addCoupon = (...args: Parameters<DomainStore['addCoupon']>) => this.action('addCoupon', args);
  toggleCoupon = (...args: Parameters<DomainStore['toggleCoupon']>) => this.action('toggleCoupon', args);
  deleteCoupon = (...args: Parameters<DomainStore['deleteCoupon']>) => this.action('deleteCoupon', args);
  moderateReview = (...args: Parameters<DomainStore['moderateReview']>) => this.action('moderateReview', args);
  updateRentalInquiryStatus = (...args: Parameters<DomainStore['updateRentalInquiryStatus']>) => this.action('updateRentalInquiryStatus', args);
  saveArticle = (...args: Parameters<DomainStore['saveArticle']>) => this.action('saveArticle', args);
  deleteArticle = (...args: Parameters<DomainStore['deleteArticle']>) => this.action('deleteArticle', args);
  checkCoupon = (code: string, amount: number) => this.action('checkCoupon', [code, amount]);
}
export const appStore = new ApiStore();
