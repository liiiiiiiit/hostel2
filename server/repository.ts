import type { Transaction, InValue } from '@libsql/client';
import { createHash } from 'node:crypto';
import type { User, AvailabilityDay } from '../src/types/index.js';
import { tables } from './relational-schema.js';
import { loadState, none, where, type Scope } from './relational-store.js';
import { publicState } from './public-state.js';
import { yerevanToday, addCalendarDays } from '../src/utils/dates.js';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const emptyScope = (): Scope => Object.fromEntries(tables.map(spec => [spec.table, none]));
export async function sessionUser(tx: Transaction, hash?: string): Promise<User | null> {
    if (!hash)
        return null;
    const match = (await tx.execute({ sql: 'SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?', args: [hash, Date.now()] })).rows[0];
    if (!match)
        return null;
    const state = (await loadState(tx, { ...emptyScope(), users: where('id=? AND is_active=1', match.user_id) })).state;
    return state.users[0] ?? null;
}
export interface RequestScope {
    action: string;
    args: unknown[];
    sessionHash?: string;
}
export async function mutationScope(tx: Transaction, request: RequestScope): Promise<Scope> {
    const { action, args } = request;
    const actor = await sessionUser(tx, request.sessionHash);
    const base = emptyScope();
    base.app_settings = { sql: '1' };
    base.audit_logs = none;
    const accountActions = ['login', 'logout', 'registerTraveler', 'requestPasswordRecovery', 'resetPassword', 'requestEmailVerification', 'verifyEmail', 'changePassword', 'logoutAll', 'updateProfile', 'mergeSavedPlaces', 'toggleAccountSaved', 'translateText', 'checkCoupon', 'notificationStatus', 'sendNotifications'];
    if (accountActions.includes(action)) {
        let targetId = '';
        if (action === 'resetPassword' || action === 'verifyEmail')
            targetId = String((await tx.execute({ sql: 'SELECT user_id FROM auth_tokens WHERE token_hash=?', args: [digest(String(args[0]))] })).rows[0]?.user_id ?? '');
        const email = ['login', 'requestPasswordRecovery'].includes(action) ? String(args[0]) : action === 'registerTraveler' ? String(args[1]) : '';
        base.users = where('id=? OR id=? OR email=? COLLATE NOCASE', actor?.id ?? '', targetId, email);
        base.user_credentials = ['login', 'changePassword', 'resetPassword'].includes(action) ? where('user_id IN (SELECT id FROM users WHERE id=? OR id=? OR email=? COLLATE NOCASE)', actor?.id ?? '', targetId, email) : none;
        base.saved_places = where('user_id=?', actor?.id ?? '');
        if (action === 'checkCoupon')
            base.coupons = where('code=? COLLATE NOCASE', String(args[0]).trim());
        return base;
    }
    base.users = where('id=?', actor?.id ?? '');
    if (action === 'updatePlatformSettings')
        return base;
    if (['saveArticle', 'deleteArticle'].includes(action)) {
        const article = action === 'saveArticle' ? args[0] as {
            id: string;
            slug: string;
        } : { id: String(args[0]), slug: '' };
        base.articles = where("id=? OR (slug<>'' AND slug=?)", article.id, article.slug);
        return base;
    }
    if (['addCoupon', 'toggleCoupon', 'deleteCoupon'].includes(action)) {
        base.coupons = where('code=? COLLATE NOCASE', String(action === 'addCoupon' ? (args[0] as {
            code: string;
        }).code : args[0]));
        return base;
    }
    if (action === 'moderateReview') {
        base.reviews = where('id=?', String(args[0]));
        return base;
    }
    if (action === 'toggleManagerActive') {
        base.users = where('id=? OR id=?', actor?.id ?? '', String(args[0]));
        return base;
    }
    if (action === 'createHostelManager') {
        const input = args[0] as {
            email: string;
            assignedHostelIds: string[];
        };
        base.users = where('id=? OR email=? COLLATE NOCASE', actor?.id ?? '', input.email.trim().toLowerCase());
        base.properties = where("kind='hostel' AND id IN (SELECT value FROM json_each(?))", JSON.stringify(input.assignedHostelIds));
        return base;
    }
    if (['createRentalInquiry', 'saveRental', 'setRentalStatus', 'toggleRentalAvailability', 'updateRentalInquiryStatus'].includes(action) || (action === 'setVerification' && args[0] === 'rental')) {
        let id = String(args[0]), slug = '';
        if (action === 'createRentalInquiry')
            id = (args[0] as {
                propertyId: string;
            }).propertyId;
        if (action === 'saveRental') {
            const value = args[0] as {
                id: string;
                slug: string;
            };
            id = value.id;
            slug = value.slug;
        }
        if (action === 'setVerification')
            id = String(args[1]);
        if (action === 'updateRentalInquiryStatus') {
            base.rental_inquiries = where('id=?', id);
            id = String((await tx.execute({ sql: 'SELECT property_id FROM rental_inquiries WHERE id=?', args: [id] })).rows[0]?.property_id ?? '');
        }
        base.properties = where("kind='rental' AND (id=? OR (slug<>'' AND slug=?))", id, slug);
        return base;
    }
    let hostelId = '', bookingId = '', retry = '', slug = '';
    if (['createBooking', 'recordExternalBooking', 'blockUnits'].includes(action)) {
        const value = args[0] as {
            hostelId?: string;
            idempotencyKey?: string;
        };
        hostelId = value.hostelId ?? '';
        retry = value.idempotencyKey ?? '';
    }
    else if (action === 'saveHostel') {
        const value = args[0] as {
            id: string;
            slug: string;
        };
        hostelId = value.id;
        slug = value.slug;
    }
    else if (action === 'setVerification' && args[0] === 'hostel')
        hostelId = String(args[1]);
    else if (['setCapacity', 'updateHostelLocation', 'updateArrivalGuide', 'toggleImmediateStay', 'setHostelStatus', 'toggleHostelPublished'].includes(action))
        hostelId = String(args[0]);
    else if (action === 'releaseUnitBlock')
        hostelId = String((await tx.execute({ sql: 'SELECT hostel_id FROM unit_blocks WHERE id=?', args: [String(args[0])] })).rows[0]?.hostel_id ?? '');
    else {
        let identifier = String(args[0] ?? '');
        if (['acceptBookingChange', 'applyBookingChange', 'rejectBookingChange'].includes(action))
            identifier = String((await tx.execute({ sql: 'SELECT booking_id FROM booking_changes WHERE id=?', args: [identifier] })).rows[0]?.booking_id ?? '');
        if (['replySupportThread', 'resolveSupportThread'].includes(action))
            identifier = String(args[1]);
        if (['updateBookingStatus', 'cancelBookingByGuest', 'reportEntranceIssue', 'submitReview', 'assignUnits', 'recordStayEvent', 'requestBookingChange', 'acceptBookingChange', 'applyBookingChange', 'rejectBookingChange', 'createSupportThread', 'replySupportThread', 'resolveSupportThread', 'recordFinanceEntry', 'claimGuestBooking'].includes(action)) {
            const row = (await tx.execute({ sql: 'SELECT id,hostel_id FROM bookings WHERE id=? OR private_token=?', args: [identifier, identifier] })).rows[0];
            hostelId = String(row?.hostel_id ?? '');
            bookingId = String(row?.id ?? '');
        }
        else {
            throw new Error('Unsupported database action scope');
        }
    }
    base.properties = where("kind='hostel' AND (id=? OR (slug<>'' AND slug=?))", hostelId, slug);
    // Each branch has its own selective index. Combining these predicates under a
    // hostel-wide OR would scan that hostel's archived bookings on every mutation.
    base.bookings = where(`id IN (
        SELECT id FROM bookings WHERE id=? AND hostel_id=?
        UNION SELECT id FROM bookings WHERE idempotency_key=? AND hostel_id=?
        UNION SELECT id FROM bookings WHERE hostel_id=? AND status='pending'
        UNION SELECT id FROM bookings WHERE hostel_id=? AND status='confirmed' AND check_out>?
        UNION SELECT id FROM bookings INDEXED BY bookings_checked_in WHERE hostel_id=? AND status='confirmed' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL
    )`, bookingId, hostelId, retry, hostelId, hostelId, hostelId, addCalendarDays(yerevanToday(), -1), hostelId);
    base.capacity_overrides = where('hostel_id=?', hostelId);
    base.unit_blocks = where('hostel_id=?', hostelId);
    base.coupons = { sql: '1' };
    // Managers/admins receive notifications; only the relevant travelers are loaded.
    base.users = where("role='admin' OR id IN (SELECT user_id FROM manager_properties WHERE hostel_id=?) OR id=? OR id IN (SELECT traveler_user_id FROM bookings WHERE id=?)", hostelId, actor?.id ?? '', bookingId);
    base.saved_places = where('user_id=?', actor?.id ?? '');
    base.reviews = where('booking_id=?', bookingId);
    base.booking_changes = where('booking_id=?', bookingId);
    base.support_threads = where('booking_id=?', bookingId);
    base.finance_entries = where('booking_id=?', bookingId);
    return base;
}
export async function visibleState(tx: Transaction, actor: User | null, demo: boolean, bookingToken = '', inquiryToken = '') {
    let scope: Scope;
    if (actor?.role === 'admin')
        scope = { user_credentials: none, audit_logs: { sql: 'id IN (SELECT id FROM audit_logs ORDER BY timestamp DESC LIMIT 500)' } };
    else {
        const userId = actor?.id ?? '';
        const bookings = where('(traveler_user_id=? AND traveler_user_id<>\'\') OR (private_token=? AND private_token<>\'\') OR hostel_id IN (SELECT hostel_id FROM manager_properties WHERE user_id=?)', userId, bookingToken, userId);
        const properties = where("(kind='hostel' AND (is_published=1 OR id IN (SELECT hostel_id FROM manager_properties WHERE user_id=?) OR id IN (SELECT hostel_id FROM bookings WHERE (traveler_user_id=? AND traveler_user_id<>'') OR (private_token=? AND private_token<>'')))) OR (kind='rental' AND listing_status='published')", userId, userId, bookingToken);
        scope = { ...emptyScope(), app_settings: { sql: '1' }, users: where('id=?', userId), properties, bookings,
            rental_inquiries: where("private_token=? AND private_token<>''", inquiryToken), coupons: { sql: '1' }, reviews: where("status='approved'"), articles: where("status='published'"), phrases: { sql: '1' }, saved_places: where('user_id=?', userId),
            capacity_overrides: where('hostel_id IN (SELECT hostel_id FROM manager_properties WHERE user_id=?)', userId), unit_blocks: where('hostel_id IN (SELECT hostel_id FROM manager_properties WHERE user_id=?)', userId), finance_entries: where('hostel_id IN (SELECT hostel_id FROM manager_properties WHERE user_id=?)', userId),
            booking_changes: where(`booking_id IN (SELECT id FROM bookings WHERE ${bookings.sql})`, ...(bookings.args ?? [])), support_threads: where(`booking_id IN (SELECT id FROM bookings WHERE ${bookings.sql})`, ...(bookings.args ?? [])),
        };
    }
    const { state } = await loadState(tx, scope);
    const ids = state.hostels.map(hostel => hostel.id);
    const availability: AvailabilityDay[] = [];
    // Aggregate upcoming occupancy in SQL, using indexed date/status lookups. No guest
    // contacts, tokens, old bookings, or credentials are loaded for public availability.
    // Split parameter groups for SQLite builds with conservative variable limits.
    for (let offset = 0; offset < ids.length; offset += 200) {
        const group = ids.slice(offset, offset + 200);
        const rows = (await tx.execute({ sql: `WITH RECURSIVE dates(day,n) AS (SELECT ?,0 UNION ALL SELECT date(day,'+1 day'),n+1 FROM dates WHERE n<90)
      SELECT r.hostel_id,r.id AS room_type_id,d.day AS date,COALESCE(c.capacity,r.total_beds_or_rooms) AS capacity,
        (SELECT COALESCE(SUM(b.quantity),0) FROM bookings b WHERE b.hostel_id=r.hostel_id AND b.room_type_id=r.id AND b.status='confirmed' AND b.check_in<=d.day AND b.check_out>d.day) AS booked,
        (SELECT COALESCE(SUM((SELECT COUNT(*) FROM unit_block_units bu WHERE bu.block_id=u.id)),0) FROM unit_blocks u WHERE u.hostel_id=r.hostel_id AND u.room_type_id=r.id AND u.released_at IS NULL AND u."from"<=d.day AND u."to">d.day) AS blocked
      FROM room_types r JOIN properties p ON p.kind='hostel' AND p.id=r.hostel_id CROSS JOIN dates d
      LEFT JOIN capacity_overrides c ON c.hostel_id=r.hostel_id AND c.room_type_id=r.id AND c.date=d.day
      WHERE COALESCE(p.public_preview,0)=0 AND r.hostel_id IN (${group.map(() => '?').join(',')}) ORDER BY p.sort_order,r.sort_order,d.day`, args: [addCalendarDays(yerevanToday(), -1), ...group] })).rows;
        for (const row of rows)
            availability.push({ hostelId: String(row.hostel_id), roomTypeId: String(row.room_type_id), date: String(row.date), capacity: Number(row.capacity), booked: Number(row.booked), available: Math.max(0, Number(row.capacity) - Number(row.booked) - Number(row.blocked)) });
    }
    return publicState(state, actor, demo, bookingToken, inquiryToken, availability);
}
export async function imageIsReferenced(tx: Transaction, url: string) {
    return !!(await tx.execute({ sql: `SELECT 1 FROM property_photos WHERE url=? UNION ALL SELECT 1 FROM property_images WHERE url=? UNION ALL SELECT 1 FROM articles WHERE featured_image=? UNION ALL SELECT 1 FROM properties WHERE json_extract(extras_json,'$.entrancePhoto')=? LIMIT 1`, args: [url, url, url, url] })).rows.length;
}
