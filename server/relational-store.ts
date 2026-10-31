import type { InStatement, InValue, ResultSet, Transaction } from '@libsql/client';
import type { AppStoreState } from './domain.js';
import { tables, quote, type TableSpec } from './relational-schema.js';
type Entity = Record<string, any>;
export interface Filter {
    sql: string;
    args?: InValue[];
}
export type Scope = Partial<Record<string, Filter>>;
export const none: Filter = { sql: '0' };
export const where = (sql: string, ...args: InValue[]): Filter => ({ sql, args });
export const rootCollections = {
    users: 'users', hostels: 'properties', rentals: 'properties', coupons: 'coupons', bookings: 'bookings',
    capacities: 'capacity_overrides', unitBlocks: 'unit_blocks', rentalInquiries: 'rental_inquiries', reviews: 'reviews',
    articles: 'articles', phrases: 'phrases', auditLogs: 'audit_logs', bookingChanges: 'booking_changes',
    supportThreads: 'support_threads', financeEntries: 'finance_entries',
} as const;
const specs = new Map(tables.map(spec => [spec.table, spec]));
const roots = Object.entries(rootCollections).filter(([key]) => !['hostels', 'rentals'].includes(key));
const propertyLocalized = ['name', 'title', 'description', 'address'];
const arrayPlaceholders: Record<string, string[]> = { users: ['assignedHostelIds'], properties: ['roomTypes', 'photos', 'media'], room_types: ['physicalUnits'], bookings: ['history', 'assignedUnitIds'], unit_blocks: ['unitIds'], articles: [], support_threads: ['messages'] };
export function stableJSON(value: unknown): string {
    return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
export function emptyState(): AppStoreState {
    return { currentUser: null, users: [], credentials: {}, hostels: [], rentals: [], coupons: [], bookings: [], capacities: [], unitBlocks: [], rentalInquiries: [], reviews: [], articles: [], phrases: [], auditLogs: [], bookingChanges: [], supportThreads: [], financeEntries: [], savedPlaces: {}, settings: { emergencyHotline: '', telegramSupport: '', supportWorkingHoursFa: '', immediateTimeoutMinutes: 30 } };
}
export interface RowData {
    values: Record<string, InValue>;
    entity: Entity;
}
export type Encoded = Map<string, Map<string, RowData>>;
function keyOf(spec: TableSpec, values: Record<string, InValue>) { return stableJSON(spec.keys.map(key => values[key])); }
export function encodeState(state: AppStoreState, legacyReviews = new Map<string, string>()): Encoded {
    const output: Encoded = new Map(tables.map(spec => [spec.table, new Map()]));
    const add = (table: string, input: Entity, excluded: string[] = []) => {
        const spec = specs.get(table)!;
        const extra = { ...input };
        const values: Record<string, InValue> = {};
        for (const column of spec.columns) {
            const value = input[column.field];
            values[column.name] = value == null ? null : column.type === 'json' ? stableJSON(value) : column.type === 'boolean' ? Number(value) : value;
            if (value !== null)
                delete extra[column.field];
        }
        for (const field of excluded)
            delete extra[field];
        for (const field of arrayPlaceholders[table] ?? [])
            if (field in input)
                extra[field] = [];
        if (table === 'properties' || table === 'room_types')
            for (const field of table === 'properties' ? propertyLocalized : ['name', 'description'])
                if (field in input)
                    extra[field] = {};
        if (table === 'articles' && 'translations' in input)
            extra.translations = {};
        values.extras_json = stableJSON(extra);
        const key = keyOf(spec, values);
        if (output.get(table)!.has(key))
            throw new Error(`Duplicate record in ${table}; migration/change was not applied.`);
        output.get(table)!.set(key, { values, entity: input });
    };
    for (const [collection, table] of roots)
        for (const value of (state as unknown as Entity)[collection] ?? []) {
            const record = { ...value };
            if (['bookings', 'reviews'].includes(table))
                record.propertyKind = 'hostel';
            if (table === 'rental_inquiries')
                record.propertyKind = 'rental';
            if (table === 'reviews' && record.bookingId && legacyReviews.get(record.id) === record.bookingId) {
                // An explicitly marked old review can retain its historic, unresolved reference.
                // New missing references are rejected by the FK rather than silently fabricated.
                record.legacyBookingId = record.bookingId;
                delete record.bookingId;
            }
            delete record.__legacyBookingId;
            add(table, record);
            if (table === 'users')
                for (const hostelId of value.assignedHostelIds ?? [])
                    add('manager_properties', { userId: value.id, hostelId, propertyKind: 'hostel' });
            if (table === 'bookings')
                for (const unitId of value.assignedUnitIds ?? [])
                    add('booking_units', { bookingId: value.id, hostelId: value.hostelId, roomId: value.roomTypeId, unitId });
            if (table === 'unit_blocks')
                for (const unitId of value.unitIds ?? [])
                    add('unit_block_units', { blockId: value.id, hostelId: value.hostelId, roomId: value.roomTypeId, unitId });
            if (table === 'bookings')
                for (const event of value.history ?? [])
                    add('booking_events', { ...event, bookingId: value.id });
            if (table === 'support_threads')
                for (const message of value.messages ?? [])
                    add('support_messages', { ...message, threadId: value.id });
            if (table === 'articles')
                for (const [language, translation] of Object.entries(value.translations ?? {}))
                    add('article_translations', { ...translation as Entity, articleId: value.id, language });
        }
    for (const [userId, credential] of Object.entries(state.credentials))
        add('user_credentials', { ...credential, userId });
    for (const [kind, collection] of [['hostel', state.hostels], ['rental', state.rentals]] as const)
        for (const property of collection) {
            const entity: Entity = { ...property, kind };
            if (kind === 'rental') {
                entity.listingStatus = entity.status;
                delete entity.status;
            }
            add('properties', entity);
            for (const field of propertyLocalized)
                for (const [language, value] of Object.entries(entity[field] ?? {}))
                    add('property_translations', { kind, propertyId: entity.id, language, field, value });
            for (const [position, url] of (property.photos ?? []).entries())
                add('property_photos', { kind, propertyId: entity.id, position, url });
            for (const image of property.media ?? [])
                add('property_images', { ...image, kind, propertyId: entity.id });
            if (kind === 'hostel')
                for (const room of (property as AppStoreState['hostels'][number]).roomTypes) {
                    add('room_types', { ...room, hostelId: property.id, propertyKind: 'hostel' });
                    for (const field of ['name', 'description'])
                        for (const [language, value] of Object.entries((room as Entity)[field] ?? {}))
                            add('room_translations', { hostelId: property.id, roomId: room.id, language, field, value });
                    for (const unit of room.physicalUnits ?? [])
                        add('physical_units', { ...unit, hostelId: property.id, roomId: room.id });
                }
        }
    for (const [userId, places] of Object.entries(state.savedPlaces ?? {}))
        for (const place of places)
            add('saved_places', { userId, place });
    for (const [key, value] of Object.entries(state.settings))
        add('app_settings', { key, value });
    return output;
}
const decode = (spec: TableSpec, row: Entity): Entity => {
    const entity: Entity = JSON.parse(String(row.extras_json));
    for (const column of spec.columns)
        if (row[column.name] !== null && row[column.name] !== undefined)
            entity[column.field] = column.type === 'json' ? JSON.parse(String(row[column.name])) : column.type === 'boolean' ? Boolean(row[column.name]) : row[column.name];
    return entity;
};
const clean = (entity: Entity, fields: string[]) => Object.fromEntries(Object.entries(entity).filter(([key]) => !fields.includes(key)));
export function decodeState(results: Map<string, ResultSet>): AppStoreState {
    const state = emptyState();
    const data = new Map(tables.map(spec => [spec.table, (results.get(spec.table)?.rows ?? []).map(row => decode(spec, row))]));
    for (const [collection, table] of roots)
        (state as unknown as Entity)[collection] = data.get(table)!;
    const properties = new Map<string, Entity>();
    for (const property of data.get('properties')!) {
        const kind = property.kind;
        delete property.kind;
        if (kind === 'rental') {
            property.status = property.listingStatus;
            delete property.listingStatus;
        }
        (kind === 'hostel' ? state.hostels : state.rentals).push(property as any);
        properties.set(stableJSON([kind, property.id]), property);
    }
    for (const row of data.get('property_translations')!) {
        const p = properties.get(stableJSON([row.kind, row.propertyId]));
        if (p)
            (p[row.field] ??= {})[row.language] = row.value;
    }
    for (const row of data.get('property_photos')!)
        properties.get(stableJSON([row.kind, row.propertyId]))?.photos.push(row.url);
    for (const row of data.get('property_images')!) {
        const p = properties.get(stableJSON([row.kind, row.propertyId]));
        if (p)
            (p.media ??= []).push(clean(row, ['kind', 'propertyId']));
    }
    const roomMap = new Map<string, Entity>();
    for (const row of data.get('room_types')!) {
        const room = clean(row, ['hostelId', 'propertyKind']);
        properties.get(stableJSON(['hostel', row.hostelId]))?.roomTypes.push(room);
        roomMap.set(stableJSON([row.hostelId, row.id]), room);
    }
    for (const row of data.get('room_translations')!) {
        const room = roomMap.get(stableJSON([row.hostelId, row.roomId]));
        if (room)
            (room[row.field] ??= {})[row.language] = row.value;
    }
    for (const row of data.get('physical_units')!) {
        const room = roomMap.get(stableJSON([row.hostelId, row.roomId]));
        if (room)
            (room.physicalUnits ??= []).push(clean(row, ['hostelId', 'roomId']));
    }
    const users = new Map(state.users.map(user => [user.id, user]));
    for (const row of data.get('manager_properties')!) {
        const user = users.get(row.userId);
        if (user)
            (user.assignedHostelIds ??= []).push(row.hostelId);
    }
    for (const row of data.get('user_credentials')!)
        state.credentials[row.userId] = clean(row, ['userId']) as any;
    const bookings = new Map(state.bookings.map(booking => [booking.id, booking]));
    for (const booking of state.bookings)
        delete (booking as unknown as Entity).propertyKind;
    for (const row of data.get('booking_events')!) {
        const b = bookings.get(row.bookingId);
        if (b)
            (b.history ??= []).push(clean(row, ['bookingId']) as any);
    }
    for (const row of data.get('booking_units')!) {
        const b = bookings.get(row.bookingId);
        if (b)
            (b.assignedUnitIds ??= []).push(row.unitId);
    }
    const blocks = new Map((state.unitBlocks ?? []).map(block => [block.id, block]));
    for (const row of data.get('unit_block_units')!) {
        const block = blocks.get(row.blockId);
        if (block)
            block.unitIds.push(row.unitId);
    }
    const articles = new Map(state.articles.map(article => [article.id, article]));
    for (const row of data.get('article_translations')!) {
        const article = articles.get(row.articleId);
        if (article)
            (article.translations ??= {})[row.language as 'fa'] = clean(row, ['articleId', 'language']) as any;
    }
    const threads = new Map((state.supportThreads ?? []).map(thread => [thread.id, thread]));
    for (const row of data.get('support_messages')!) {
        const thread = threads.get(row.threadId);
        if (thread)
            thread.messages.push(clean(row, ['threadId']) as any);
    }
    for (const inquiry of state.rentalInquiries)
        delete (inquiry as unknown as Entity).propertyKind;
    for (const review of state.reviews) {
        const r = review as unknown as Entity;
        delete r.propertyKind;
        if (r.legacyBookingId) {
            r.bookingId = r.legacyBookingId;
            delete r.legacyBookingId;
        }
    }
    for (const row of data.get('saved_places')!)
        (state.savedPlaces![row.userId] ??= []).push(row.place);
    for (const row of data.get('app_settings')!)
        (state.settings as Entity)[row.key] = row.value;
    return state;
}
export interface LoadedState {
    state: AppStoreState;
    rows: Map<string, ResultSet>;
    baseline: Encoded;
    legacyReviews: Map<string, string>;
}
export async function loadState(tx: Transaction, scope: Scope = {}): Promise<LoadedState> {
    const filters: Scope = { ...scope };
    const subset = (table: string, sql: string, parent: string) => { const f = filters[parent]; if (f)
        filters[table] = { sql: `${sql} (${f.sql})`, args: f.args }; };
    subset('manager_properties', 'user_id IN (SELECT id FROM users WHERE', 'users');
    // Close each dependent subquery after applying the static parent selector.
    if (filters.manager_properties)
        filters.manager_properties.sql += ')';
    if (scope.user_credentials === undefined) {
        subset('user_credentials', 'user_id IN (SELECT id FROM users WHERE', 'users');
        if (filters.user_credentials)
            filters.user_credentials.sql += ')';
    }
    for (const table of ['property_translations', 'property_photos', 'property_images']) {
        subset(table, '(kind,property_id) IN (SELECT kind,id FROM properties WHERE', 'properties');
        if (filters[table])
            filters[table]!.sql += ')';
    }
    subset('room_types', "hostel_id IN (SELECT id FROM properties WHERE kind='hostel' AND", 'properties');
    if (filters.room_types)
        filters.room_types.sql += ')';
    for (const table of ['room_translations', 'physical_units']) {
        subset(table, '(hostel_id,room_id) IN (SELECT hostel_id,id FROM room_types WHERE', 'room_types');
        if (filters[table])
            filters[table]!.sql += ')';
    }
    for (const [table, column, parent] of [['booking_events', 'booking_id', 'bookings'], ['booking_units', 'booking_id', 'bookings'], ['unit_block_units', 'block_id', 'unit_blocks'], ['article_translations', 'article_id', 'articles'], ['support_messages', 'thread_id', 'support_threads']]) {
        subset(table, `${column} IN (SELECT id FROM ${parent} WHERE`, parent);
        if (filters[table])
            filters[table]!.sql += ')';
    }
    const selected = tables.filter(spec => filters[spec.table]?.sql !== '0');
    const results = selected.length ? await tx.batch(selected.map(spec => ({ sql: `SELECT * FROM ${quote(spec.table)} ${filters[spec.table] ? 'WHERE ' + filters[spec.table]!.sql : ''} ORDER BY sort_order`, args: filters[spec.table]?.args ?? [] }))) : [];
    const rows = new Map(tables.map(spec => [spec.table, ({ rows: [] } as unknown as ResultSet)]));
    selected.forEach((spec, i) => rows.set(spec.table, results[i]));
    const state = decodeState(rows);
    const legacyReviews = new Map((rows.get('reviews')?.rows ?? []).filter(row => row.legacy_booking_id).map(row => [String(row.id), String(row.legacy_booking_id)]));
    return { state, rows, legacyReviews, baseline: encodeState(state, legacyReviews) };
}
// Ordering is local to a parent for nested lists; IDs remain stable when photos,
// physical units or saved places are rearranged. Scalar/object translations do not
// need changes to unrelated parents' ordering.
const orderParents: Record<string, string[]> = {
    properties: ['kind'], manager_properties: ['user_id'], property_translations: ['kind', 'property_id'], room_types: ['hostel_id'],
    room_translations: ['hostel_id', 'room_id'], physical_units: ['hostel_id', 'room_id'], property_photos: ['kind', 'property_id'],
    property_images: ['kind', 'property_id'], booking_events: ['booking_id'], booking_units: ['booking_id'],
    unit_block_units: ['block_id'], article_translations: ['article_id'], support_messages: ['thread_id'], saved_places: ['user_id'],
};
function orderRows(spec: TableSpec, next: Map<string, RowData>, existing: Map<string, number>, low: number, high: number) {
    const groups = new Map<string, [
        string,
        RowData
    ][]>();
    for (const entry of next) {
        const group = stableJSON((orderParents[spec.table] ?? []).map(key => entry[1].values[key]));
        if (!groups.has(group))
            groups.set(group, []);
        groups.get(group)!.push(entry);
    }
    const orders = new Map<string, number>();
    for (const entries of groups.values()) {
        const known = entries.filter(([key]) => existing.has(key)).map(([key]) => existing.get(key)!);
        const reordered = known.some((value, i) => i > 0 && value <= known[i - 1]);
        if (reordered) {
            entries.forEach(([key], i) => orders.set(key, low + i));
            continue;
        }
        let previous: number | undefined;
        for (let i = 0; i < entries.length;) {
            const [key] = entries[i];
            if (existing.has(key)) {
                previous = existing.get(key)!;
                orders.set(key, previous);
                i++;
                continue;
            }
            let end = i;
            while (end < entries.length && !existing.has(entries[end][0]))
                end++;
            const following = end < entries.length ? existing.get(entries[end][0])! : undefined;
            const count = end - i;
            const left = previous ?? low - count - 1, right = following ?? Math.max(high + count + 1, left + count + 1);
            if (!(right > left) || Math.abs(right - left) / (count + 1) < Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right))) {
                entries.forEach(([k], j) => orders.set(k, low + j));
                break;
            }
            for (let j = 0; j < count; j++) {
                const rank = left + (right - left) * (j + 1) / (count + 1);
                orders.set(entries[i + j][0], rank);
                previous = rank;
            }
            i = end;
        }
    }
    return orders;
}
export async function flushState(tx: Transaction, loaded: LoadedState) {
    const after = encodeState(loaded.state, loaded.legacyReviews);
    const writes: InStatement[] = [], deletes: InStatement[] = [];
    const ordersByTable = new Map<string, Map<string, number>>();
    const insertedTables = tables.filter(spec => [...after.get(spec.table)!.keys()].some(key => !loaded.baseline.get(spec.table)!.has(key)));
    // Indexed endpoint lookups keep new records ordered even when this transaction
    // loaded only one hostel or user and older rows were deliberately not selected.
    const limits = insertedTables.length ? await tx.batch(insertedTables.map(spec => `SELECT (SELECT sort_order FROM ${quote(spec.table)} ORDER BY sort_order LIMIT 1) AS low,(SELECT sort_order FROM ${quote(spec.table)} ORDER BY sort_order DESC LIMIT 1) AS high`)) : [];
    const bounds = new Map(insertedTables.map((spec, i) => [spec.table, { low: Number(limits[i].rows[0]?.low ?? 0), high: Number(limits[i].rows[0]?.high ?? 0) }]));
    for (const spec of tables) {
        const before = loaded.baseline.get(spec.table)!, next = after.get(spec.table)!;
        const existing = new Map((loaded.rows.get(spec.table)?.rows ?? []).map(row => [keyOf(spec, row as any), Number(row.sort_order)]));
        const bound = bounds.get(spec.table) ?? { low: 0, high: 0 };
        const orders = orderRows(spec, next, existing, bound.low, bound.high);
        ordersByTable.set(spec.table, orders);
        for (const [key, row] of next) {
            const order = orders.get(key)!;
            if (before.has(key) && stableJSON(before.get(key)!.values) === stableJSON(row.values) && existing.get(key) === order)
                continue;
            const columns = [...Object.keys(row.values), 'sort_order'];
            writes.push({ sql: `INSERT INTO ${quote(spec.table)} (${columns.map(quote).join(',')}) VALUES(${columns.map(() => '?').join(',')}) ON CONFLICT(${spec.keys.map(quote).join(',')}) DO UPDATE SET ${columns.filter(c => !spec.keys.includes(c)).map(c => `${quote(c)}=excluded.${quote(c)}`).join(',')}`, args: [...Object.values(row.values), order] });
        }
        for (const [key, row] of before)
            if (!next.has(key))
                deletes.unshift({ sql: `DELETE FROM ${quote(spec.table)} WHERE ${spec.keys.map(key => quote(key) + '=?').join(' AND ')}`, args: spec.keys.map(key => row.values[key]) });
    }
    if (writes.length)
        await tx.batch(writes);
    if (deletes.length)
        await tx.batch(deletes);
    if ((after.get('audit_logs')?.size ?? 0) > (loaded.baseline.get('audit_logs')?.size ?? 0))
        await tx.execute('DELETE FROM audit_logs WHERE id IN (SELECT id FROM audit_logs ORDER BY timestamp DESC,sort_order LIMIT -1 OFFSET 500)');
    loaded.baseline = after;
    for (const spec of tables)
        loaded.rows.get(spec.table)!.rows = [...after.get(spec.table)!].map(([key, row]) => ({ ...row.values, sort_order: ordersByTable.get(spec.table)!.get(key)! }) as any);
}
