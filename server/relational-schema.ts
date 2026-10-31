/** Relational schema v3. JSON is reserved for flexible attributes and frozen agreements,
 * never a whole application/user/booking record. SQL names are static, not user input. */
export interface Column {
    field: string;
    name: string;
    sql: string;
    type?: 'json' | 'boolean';
}
export interface TableSpec {
    table: string;
    keys: string[];
    columns: Column[];
    constraints?: string[];
}
const snake = (field: string) => field.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
export function column(field: string, sql = 'TEXT', type?: Column['type']): Column { return { field, name: snake(field), sql, type }; }
const text = (fields: string) => fields.split(' ').map(field => column(field));
const numbers = (fields: string) => fields.split(' ').map(field => column(field, 'INTEGER'));
const flags = (fields: string) => fields.split(' ').map(field => column(field, `INTEGER CHECK(${snake(field)} IN (0,1))`, 'boolean'));
const json = (fields: string) => fields.split(' ').map(field => column(field, 'TEXT', 'json'));
const fk = (fields: string, table: string, references: string, onDelete = 'RESTRICT') => `FOREIGN KEY(${fields}) REFERENCES ${table}(${references}) ON DELETE ${onDelete} DEFERRABLE INITIALLY DEFERRED`;
export const tables: TableSpec[] = [
    { table: 'users', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('email', 'TEXT NOT NULL COLLATE NOCASE UNIQUE'), column('name', 'TEXT NOT NULL'), column('role', "TEXT NOT NULL CHECK(role IN ('admin','hostel_manager','traveler'))"), ...text('phone createdAt emailVerifiedAt language'), ...flags('isActive mustChangePassword emailNotifications')] },
    { table: 'user_credentials', keys: ['user_id'], columns: [column('userId', 'TEXT NOT NULL'), column('hash', 'TEXT NOT NULL'), column('salt', 'TEXT NOT NULL')], constraints: [fk('user_id', 'users', 'id', 'CASCADE')] },
    { table: 'properties', keys: ['kind', 'id'], columns: [column('kind', "TEXT NOT NULL CHECK(kind IN ('hostel','rental'))"), column('id', 'TEXT NOT NULL'), ...text('slug city district phone email neighborhood propertyType rentalType'), ...numbers('minPricePerNightAMD pricePerNightAMD pricePerMonthAMD areaSqm'), ...flags('nearMetro monthlyStayAvailable reception24h'), column('listingStatus', "TEXT CHECK(listing_status IN ('draft','published','hidden','archived'))"), ...flags('isPublished publicPreview sampleContent factsConfirmed'), ...text('createdAt updatedAt')], constraints: [] },
    { table: 'manager_properties', keys: ['user_id', 'hostel_id'], columns: [column('userId', 'TEXT NOT NULL'), column('hostelId', 'TEXT NOT NULL'), column('propertyKind', "TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel')")], constraints: [fk('user_id', 'users', 'id', 'CASCADE'), fk('property_kind,hostel_id', 'properties', 'kind,id')] },
    { table: 'property_translations', keys: ['kind', 'property_id', 'language', 'field'], columns: [column('kind', 'TEXT NOT NULL'), column('propertyId', 'TEXT NOT NULL'), column('language', "TEXT NOT NULL CHECK(language IN ('fa','en','ru','hy'))"), column('field', 'TEXT NOT NULL'), column('value', 'TEXT NOT NULL')], constraints: [fk('kind,property_id', 'properties', 'kind,id', 'CASCADE')] },
    { table: 'room_types', keys: ['hostel_id', 'id'], columns: [column('hostelId', 'TEXT NOT NULL'), column('id', 'TEXT NOT NULL'), column('propertyKind', "TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel')"), column('type', "TEXT NOT NULL CHECK(type IN ('private','dorm_mixed','dorm_female','dorm_male'))"), column('bookingUnit', "TEXT CHECK(booking_unit IN ('bed','room'))"), column('totalBedsOrRooms', 'INTEGER NOT NULL CHECK(total_beds_or_rooms >= 0)'), column('maxGuestsPerUnit', 'INTEGER CHECK(max_guests_per_unit >= 1)'), column('pricePerNightAMD', 'INTEGER NOT NULL CHECK(price_per_night_amd >= 0)'), ...json('pricingRules')], constraints: [fk('property_kind,hostel_id', 'properties', 'kind,id', 'CASCADE')] },
    { table: 'room_translations', keys: ['hostel_id', 'room_id', 'language', 'field'], columns: [column('hostelId', 'TEXT NOT NULL'), column('roomId', 'TEXT NOT NULL'), column('language', "TEXT NOT NULL CHECK(language IN ('fa','en','ru','hy'))"), column('field', 'TEXT NOT NULL'), column('value', 'TEXT NOT NULL')], constraints: [fk('hostel_id,room_id', 'room_types', 'hostel_id,id', 'CASCADE')] },
    { table: 'physical_units', keys: ['hostel_id', 'room_id', 'id'], columns: [column('hostelId', 'TEXT NOT NULL'), column('roomId', 'TEXT NOT NULL'), column('id', 'TEXT NOT NULL'), column('label', 'TEXT NOT NULL')], constraints: [fk('hostel_id,room_id', 'room_types', 'hostel_id,id', 'CASCADE'), 'UNIQUE(hostel_id,id)'] },
    { table: 'property_photos', keys: ['kind', 'property_id', 'position'], columns: [column('kind', 'TEXT NOT NULL'), column('propertyId', 'TEXT NOT NULL'), column('position', 'INTEGER NOT NULL'), column('url', 'TEXT NOT NULL')], constraints: [fk('kind,property_id', 'properties', 'kind,id', 'CASCADE')] },
    { table: 'property_images', keys: ['kind', 'property_id', 'id'], columns: [column('kind', 'TEXT NOT NULL'), column('propertyId', 'TEXT NOT NULL'), column('id', 'TEXT NOT NULL'), column('url', 'TEXT NOT NULL'), ...json('alt'), ...text('roomTypeId')], constraints: [fk('kind,property_id', 'properties', 'kind,id', 'CASCADE')] },
    { table: 'coupons', keys: ['code'], columns: [column('code', 'TEXT NOT NULL COLLATE NOCASE'), ...numbers('percent minAmountAMD maxUses usedCount'), ...flags('active'), ...text('startsAt expiresAt description')], constraints: ['CHECK(percent BETWEEN 0 AND 100)', 'CHECK(used_count >= 0)'] },
    { table: 'bookings', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('propertyKind', "TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel')"), column('hostelId', 'TEXT NOT NULL'), column('roomTypeId', 'TEXT NOT NULL'), column('trackingCode', 'TEXT NOT NULL UNIQUE'), column('privateToken', 'TEXT NOT NULL UNIQUE'), column('idempotencyKey', 'TEXT UNIQUE'), ...text('travelerUserId hostelName roomTypeName guestName contactType guestContact checkIn checkOut estimatedArrivalTime specialRequests couponCode rejectionReason cancellationReason confirmedAt createdAt updatedAt expiresAt language requestFingerprint source actualArrivalDate arrivalMode checkedInAt checkedOutAt reminderAt escalatedAt versionToken entranceIssueNote reviewId'), ...numbers('nights guestsCount quantity earlyCheckInFeeAMD lateCheckInFeeAMD extraServicesFeeAMD baseAmountAMD discountPercent discountAmountAMD finalAmountAMD cancellationChargeAMD'), column('status', "TEXT NOT NULL CHECK(status IN ('pending','confirmed','rejected','cancelled','expired','completed','no_show'))"), ...flags('isLowerBunkRequested isImmediateArrival isOvernightArrival entranceIssueReported'), ...json('agreement searchContext selectedServiceIds commissionRule')], constraints: [fk('property_kind,hostel_id', 'properties', 'kind,id'), fk('hostel_id,room_type_id', 'room_types', 'hostel_id,id'), fk('traveler_user_id', 'users', 'id', 'SET NULL'), 'CHECK(check_out > check_in)', 'CHECK(quantity >= 1 AND guests_count >= 1)', 'CHECK(final_amount_amd >= 0)', 'UNIQUE(id,hostel_id)', 'UNIQUE(id,hostel_id,room_type_id)'] },
    { table: 'booking_events', keys: ['booking_id', 'id'], columns: [column('bookingId', 'TEXT NOT NULL'), column('id', 'TEXT NOT NULL'), ...text('at actorId action reason'), ...numbers('amountAMD')], constraints: [fk('booking_id', 'bookings', 'id', 'CASCADE')] },
    { table: 'booking_units', keys: ['booking_id', 'unit_id'], columns: [column('bookingId', 'TEXT NOT NULL'), column('hostelId', 'TEXT NOT NULL'), column('roomId', 'TEXT NOT NULL'), column('unitId', 'TEXT NOT NULL')], constraints: [fk('booking_id,hostel_id,room_id', 'bookings', 'id,hostel_id,room_type_id', 'CASCADE'), fk('hostel_id,room_id,unit_id', 'physical_units', 'hostel_id,room_id,id')] },
    { table: 'capacity_overrides', keys: ['hostel_id', 'room_type_id', 'date'], columns: [column('hostelId', 'TEXT NOT NULL'), column('roomTypeId', 'TEXT NOT NULL'), column('date', 'TEXT NOT NULL'), column('capacity', 'INTEGER NOT NULL CHECK(capacity >= 0)')], constraints: [fk('hostel_id,room_type_id', 'room_types', 'hostel_id,id', 'CASCADE')] },
    { table: 'unit_blocks', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('hostelId', 'TEXT NOT NULL'), column('roomTypeId', 'TEXT NOT NULL'), ...text('from to reason createdAt releasedAt'),], constraints: [fk('hostel_id,room_type_id', 'room_types', 'hostel_id,id'), 'CHECK("to" > "from")', 'UNIQUE(id,hostel_id,room_type_id)'] },
    { table: 'unit_block_units', keys: ['block_id', 'unit_id'], columns: [column('blockId', 'TEXT NOT NULL'), column('hostelId', 'TEXT NOT NULL'), column('roomId', 'TEXT NOT NULL'), column('unitId', 'TEXT NOT NULL')], constraints: [fk('block_id,hostel_id,room_id', 'unit_blocks', 'id,hostel_id,room_type_id', 'CASCADE'), fk('hostel_id,room_id,unit_id', 'physical_units', 'hostel_id,room_id,id')] },
    { table: 'rental_inquiries', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('propertyKind', "TEXT NOT NULL DEFAULT 'rental' CHECK(property_kind='rental')"), column('propertyId', 'TEXT NOT NULL'), column('trackingCode', 'TEXT NOT NULL UNIQUE'), column('privateToken', 'TEXT NOT NULL UNIQUE'), ...text('propertyTitle guestName contact requestType desiredStartDate desiredDurationText proposedVisitDate notes status adminNotes createdAt updatedAt'), ...numbers('residentsCount')], constraints: [fk('property_kind,property_id', 'properties', 'kind,id')] },
    { table: 'reviews', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('hostelId', 'TEXT NOT NULL'), column('propertyKind', "TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel')"), column('bookingId', 'TEXT'), column('legacyBookingId', 'TEXT'), ...text('hostelName guestName comment status adminReply createdAt'), column('rating', 'INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5)'), ...json('scores')], constraints: [fk('property_kind,hostel_id', 'properties', 'kind,id'), fk('booking_id,hostel_id', 'bookings', 'id,hostel_id'), 'CHECK((booking_id IS NOT NULL) <> (legacy_booking_id IS NOT NULL))'] },
    { table: 'articles', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), ...text('slug title summary category featuredImage content author language status lastVerifiedDate createdAt updatedAt'), ...flags('isSampleDraft'), ...json('tags sources')] },
    { table: 'article_translations', keys: ['article_id', 'language'], columns: [column('articleId', 'TEXT NOT NULL'), column('language', "TEXT NOT NULL CHECK(language IN ('fa','en','ru','hy'))"), ...text('title summary content')], constraints: [fk('article_id', 'articles', 'id', 'CASCADE')] },
    { table: 'phrases', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), ...text('category categoryLabelFa fa en ru hy phoneticHy note')] },
    { table: 'audit_logs', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), ...text('timestamp actorId actorName actorRole action targetType targetId details')] },
    { table: 'booking_changes', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('bookingId', 'TEXT NOT NULL'), ...text('checkIn checkOut bookingVersion propertyVersion reason requestedBy createdAt guestAcceptedAt status'), ...numbers('guestsCount quantity amountAMD differenceAMD'), ...json('pricing')], constraints: [fk('booking_id', 'bookings', 'id', 'CASCADE')] },
    { table: 'support_threads', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('bookingId', 'TEXT NOT NULL'), ...text('category status createdAt updatedAt')], constraints: [fk('booking_id', 'bookings', 'id', 'CASCADE')] },
    { table: 'support_messages', keys: ['thread_id', 'id'], columns: [column('threadId', 'TEXT NOT NULL'), column('id', 'TEXT NOT NULL'), ...text('at actorId role text')], constraints: [fk('thread_id', 'support_threads', 'id', 'CASCADE')] },
    { table: 'finance_entries', keys: ['id'], columns: [column('id', 'TEXT NOT NULL'), column('bookingId', 'TEXT NOT NULL'), column('hostelId', 'TEXT NOT NULL'), ...text('kind reason actorId createdAt requestId'), column('amountAMD', 'INTEGER NOT NULL')], constraints: [fk('booking_id,hostel_id', 'bookings', 'id,hostel_id'), 'UNIQUE(booking_id,request_id)'] },
    { table: 'saved_places', keys: ['user_id', 'place'], columns: [column('userId', 'TEXT NOT NULL'), column('place', 'TEXT NOT NULL')], constraints: [fk('user_id', 'users', 'id', 'CASCADE')] },
    { table: 'app_settings', keys: ['key'], columns: [column('key', 'TEXT NOT NULL'), ...json('value')] },
];
// Required domain invariants are enforced even for direct SQL writes.
const required: Record<string, string> = {
    users: 'isActive createdAt', properties: 'slug city createdAt updatedAt',
    bookings: 'checkIn checkOut nights guestsCount quantity baseAmountAMD discountPercent discountAmountAMD finalAmountAMD guestName guestContact contactType createdAt updatedAt expiresAt',
    coupons: 'percent minAmountAMD maxUses usedCount active startsAt expiresAt',
    articles: 'slug title summary content language status createdAt updatedAt',
    reviews: 'comment status createdAt', rental_inquiries: 'guestName contact requestType status createdAt updatedAt',
    finance_entries: 'kind createdAt requestId', support_threads: 'category status createdAt updatedAt', support_messages: 'at text',
};
for (const spec of tables)
    for (const column of spec.columns)
        if (required[spec.table]?.split(' ').includes(column.field) && !column.sql.includes('NOT NULL'))
            column.sql += ' NOT NULL';
export const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
export const schemaSQL = tables.map(spec => `CREATE TABLE ${quote(spec.table)} (${spec.columns.map(c => `${quote(c.name)} ${c.sql}`).join(',')}, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY(${spec.keys.map(quote).join(',')})${spec.constraints?.length ? ',' + spec.constraints.join(',') : ''})`);
export const indexSQL = [
    ...tables.map(table => `CREATE INDEX ${table.table}_sort ON ${quote(table.table)}(sort_order)`),
    "CREATE UNIQUE INDEX properties_slug ON properties(kind,slug) WHERE slug IS NOT NULL AND slug<>''",
    'CREATE INDEX properties_public ON properties(kind,is_published,listing_status,city)',
    'CREATE INDEX properties_hostel_price ON properties(kind,is_published,min_price_per_night_amd)',
    'CREATE INDEX properties_rental_price ON properties(kind,listing_status,price_per_month_amd)',
    'CREATE INDEX room_types_price ON room_types(hostel_id,price_per_night_amd)',
    'CREATE INDEX bookings_inventory ON bookings(hostel_id,room_type_id,status,check_out,check_in)',
    'CREATE INDEX bookings_traveler ON bookings(traveler_user_id,created_at)',
    'CREATE INDEX bookings_due ON bookings(status,expires_at)',
    'CREATE INDEX bookings_hostel_status ON bookings(hostel_id,status,created_at)',
    'CREATE INDEX bookings_hostel_active ON bookings(hostel_id,status,check_out)',
    "CREATE INDEX bookings_checked_in ON bookings(hostel_id) WHERE status='confirmed' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL",
    'CREATE INDEX unit_blocks_inventory ON unit_blocks(hostel_id,room_type_id,released_at,"from","to")',
    'CREATE INDEX reviews_public ON reviews(status,hostel_id,created_at)',
    'CREATE INDEX reviews_booking ON reviews(booking_id)',
    'CREATE INDEX articles_public ON articles(status,language,created_at)',
    'CREATE UNIQUE INDEX articles_slug ON articles(slug) WHERE slug IS NOT NULL AND slug<>\'\'',
    'CREATE INDEX audit_logs_recent ON audit_logs(timestamp DESC)',
    'CREATE INDEX manager_properties_hostel ON manager_properties(hostel_id,user_id)',
    'CREATE INDEX booking_changes_booking ON booking_changes(booking_id,status)',
    'CREATE INDEX support_threads_booking ON support_threads(booking_id,status)',
    'CREATE INDEX finance_entries_hostel ON finance_entries(hostel_id,created_at)',
    'CREATE INDEX rental_inquiries_status ON rental_inquiries(status,created_at)',
    'CREATE INDEX property_photos_url ON property_photos(url)',
    'CREATE INDEX property_images_url ON property_images(url)',
    'CREATE INDEX articles_image ON articles(featured_image)',
    "CREATE INDEX properties_entrance_image ON properties(json_extract(extras_json,'$.entrancePhoto'))",
    'CREATE INDEX media_assets_created ON media_assets(created_at)',
    'CREATE INDEX outbox_dispatch ON outbox(status,next_attempt,created_at)',
    'CREATE INDEX sessions_expiry ON sessions(expires_at)',
    'CREATE INDEX sessions_user ON sessions(user_id)',
    'CREATE INDEX auth_tokens_user ON auth_tokens(user_id,purpose)',
    'CREATE INDEX auth_tokens_expiry ON auth_tokens(expires_at)',
    'CREATE INDEX rate_limits_expiry ON rate_limits(expires_at)',
];
