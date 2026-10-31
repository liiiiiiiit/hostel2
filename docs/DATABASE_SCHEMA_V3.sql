-- YEREVANHUB schema v3. Reference only; use npm run db:migrate to preserve existing data.
-- Existing v2 infrastructure tables (sessions, auth_tokens, outbox, media_assets, etc.) are retained.

CREATE TABLE "users" ("id" TEXT NOT NULL,"email" TEXT NOT NULL COLLATE NOCASE UNIQUE,"name" TEXT NOT NULL,"role" TEXT NOT NULL CHECK(role IN ('admin','hostel_manager','traveler')),"phone" TEXT,"created_at" TEXT NOT NULL,"email_verified_at" TEXT,"language" TEXT,"is_active" INTEGER CHECK(is_active IN (0,1)) NOT NULL,"must_change_password" INTEGER CHECK(must_change_password IN (0,1)),"email_notifications" INTEGER CHECK(email_notifications IN (0,1)), extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"));

CREATE TABLE "user_credentials" ("user_id" TEXT NOT NULL,"hash" TEXT NOT NULL,"salt" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("user_id"),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "properties" ("kind" TEXT NOT NULL CHECK(kind IN ('hostel','rental')),"id" TEXT NOT NULL,"slug" TEXT NOT NULL,"city" TEXT NOT NULL,"district" TEXT,"phone" TEXT,"email" TEXT,"neighborhood" TEXT,"property_type" TEXT,"rental_type" TEXT,"min_price_per_night_amd" INTEGER,"price_per_night_amd" INTEGER,"price_per_month_amd" INTEGER,"area_sqm" INTEGER,"near_metro" INTEGER CHECK(near_metro IN (0,1)),"monthly_stay_available" INTEGER CHECK(monthly_stay_available IN (0,1)),"reception24h" INTEGER CHECK(reception24h IN (0,1)),"listing_status" TEXT CHECK(listing_status IN ('draft','published','hidden','archived')),"is_published" INTEGER CHECK(is_published IN (0,1)),"public_preview" INTEGER CHECK(public_preview IN (0,1)),"sample_content" INTEGER CHECK(sample_content IN (0,1)),"facts_confirmed" INTEGER CHECK(facts_confirmed IN (0,1)),"created_at" TEXT NOT NULL,"updated_at" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("kind","id"));

CREATE TABLE "manager_properties" ("user_id" TEXT NOT NULL,"hostel_id" TEXT NOT NULL,"property_kind" TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel'), extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("user_id","hostel_id"),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,FOREIGN KEY(property_kind,hostel_id) REFERENCES properties(kind,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "property_translations" ("kind" TEXT NOT NULL,"property_id" TEXT NOT NULL,"language" TEXT NOT NULL CHECK(language IN ('fa','en','ru','hy')),"field" TEXT NOT NULL,"value" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("kind","property_id","language","field"),FOREIGN KEY(kind,property_id) REFERENCES properties(kind,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "room_types" ("hostel_id" TEXT NOT NULL,"id" TEXT NOT NULL,"property_kind" TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel'),"type" TEXT NOT NULL CHECK(type IN ('private','dorm_mixed','dorm_female','dorm_male')),"booking_unit" TEXT CHECK(booking_unit IN ('bed','room')),"total_beds_or_rooms" INTEGER NOT NULL CHECK(total_beds_or_rooms >= 0),"max_guests_per_unit" INTEGER CHECK(max_guests_per_unit >= 1),"price_per_night_amd" INTEGER NOT NULL CHECK(price_per_night_amd >= 0),"pricing_rules" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("hostel_id","id"),FOREIGN KEY(property_kind,hostel_id) REFERENCES properties(kind,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "room_translations" ("hostel_id" TEXT NOT NULL,"room_id" TEXT NOT NULL,"language" TEXT NOT NULL CHECK(language IN ('fa','en','ru','hy')),"field" TEXT NOT NULL,"value" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("hostel_id","room_id","language","field"),FOREIGN KEY(hostel_id,room_id) REFERENCES room_types(hostel_id,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "physical_units" ("hostel_id" TEXT NOT NULL,"room_id" TEXT NOT NULL,"id" TEXT NOT NULL,"label" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("hostel_id","room_id","id"),FOREIGN KEY(hostel_id,room_id) REFERENCES room_types(hostel_id,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,UNIQUE(hostel_id,id));

CREATE TABLE "property_photos" ("kind" TEXT NOT NULL,"property_id" TEXT NOT NULL,"position" INTEGER NOT NULL,"url" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("kind","property_id","position"),FOREIGN KEY(kind,property_id) REFERENCES properties(kind,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "property_images" ("kind" TEXT NOT NULL,"property_id" TEXT NOT NULL,"id" TEXT NOT NULL,"url" TEXT NOT NULL,"alt" TEXT,"room_type_id" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("kind","property_id","id"),FOREIGN KEY(kind,property_id) REFERENCES properties(kind,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "coupons" ("code" TEXT NOT NULL COLLATE NOCASE,"percent" INTEGER NOT NULL,"min_amount_amd" INTEGER NOT NULL,"max_uses" INTEGER NOT NULL,"used_count" INTEGER NOT NULL,"active" INTEGER CHECK(active IN (0,1)) NOT NULL,"starts_at" TEXT NOT NULL,"expires_at" TEXT NOT NULL,"description" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("code"),CHECK(percent BETWEEN 0 AND 100),CHECK(used_count >= 0));

CREATE TABLE "bookings" ("id" TEXT NOT NULL,"property_kind" TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel'),"hostel_id" TEXT NOT NULL,"room_type_id" TEXT NOT NULL,"tracking_code" TEXT NOT NULL UNIQUE,"private_token" TEXT NOT NULL UNIQUE,"idempotency_key" TEXT UNIQUE,"traveler_user_id" TEXT,"hostel_name" TEXT,"room_type_name" TEXT,"guest_name" TEXT NOT NULL,"contact_type" TEXT NOT NULL,"guest_contact" TEXT NOT NULL,"check_in" TEXT NOT NULL,"check_out" TEXT NOT NULL,"estimated_arrival_time" TEXT,"special_requests" TEXT,"coupon_code" TEXT,"rejection_reason" TEXT,"cancellation_reason" TEXT,"confirmed_at" TEXT,"created_at" TEXT NOT NULL,"updated_at" TEXT NOT NULL,"expires_at" TEXT NOT NULL,"language" TEXT,"request_fingerprint" TEXT,"source" TEXT,"actual_arrival_date" TEXT,"arrival_mode" TEXT,"checked_in_at" TEXT,"checked_out_at" TEXT,"reminder_at" TEXT,"escalated_at" TEXT,"version_token" TEXT,"entrance_issue_note" TEXT,"review_id" TEXT,"nights" INTEGER NOT NULL,"guests_count" INTEGER NOT NULL,"quantity" INTEGER NOT NULL,"early_check_in_fee_amd" INTEGER,"late_check_in_fee_amd" INTEGER,"extra_services_fee_amd" INTEGER,"base_amount_amd" INTEGER NOT NULL,"discount_percent" INTEGER NOT NULL,"discount_amount_amd" INTEGER NOT NULL,"final_amount_amd" INTEGER NOT NULL,"cancellation_charge_amd" INTEGER,"status" TEXT NOT NULL CHECK(status IN ('pending','confirmed','rejected','cancelled','expired','completed','no_show')),"is_lower_bunk_requested" INTEGER CHECK(is_lower_bunk_requested IN (0,1)),"is_immediate_arrival" INTEGER CHECK(is_immediate_arrival IN (0,1)),"is_overnight_arrival" INTEGER CHECK(is_overnight_arrival IN (0,1)),"entrance_issue_reported" INTEGER CHECK(entrance_issue_reported IN (0,1)),"agreement" TEXT,"search_context" TEXT,"selected_service_ids" TEXT,"commission_rule" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"),FOREIGN KEY(property_kind,hostel_id) REFERENCES properties(kind,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,FOREIGN KEY(hostel_id,room_type_id) REFERENCES room_types(hostel_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,FOREIGN KEY(traveler_user_id) REFERENCES users(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,CHECK(check_out > check_in),CHECK(quantity >= 1 AND guests_count >= 1),CHECK(final_amount_amd >= 0),UNIQUE(id,hostel_id),UNIQUE(id,hostel_id,room_type_id));

CREATE TABLE "booking_events" ("booking_id" TEXT NOT NULL,"id" TEXT NOT NULL,"at" TEXT,"actor_id" TEXT,"action" TEXT,"reason" TEXT,"amount_amd" INTEGER, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("booking_id","id"),FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "booking_units" ("booking_id" TEXT NOT NULL,"hostel_id" TEXT NOT NULL,"room_id" TEXT NOT NULL,"unit_id" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("booking_id","unit_id"),FOREIGN KEY(booking_id,hostel_id,room_id) REFERENCES bookings(id,hostel_id,room_type_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,FOREIGN KEY(hostel_id,room_id,unit_id) REFERENCES physical_units(hostel_id,room_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "capacity_overrides" ("hostel_id" TEXT NOT NULL,"room_type_id" TEXT NOT NULL,"date" TEXT NOT NULL,"capacity" INTEGER NOT NULL CHECK(capacity >= 0), extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("hostel_id","room_type_id","date"),FOREIGN KEY(hostel_id,room_type_id) REFERENCES room_types(hostel_id,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "unit_blocks" ("id" TEXT NOT NULL,"hostel_id" TEXT NOT NULL,"room_type_id" TEXT NOT NULL,"from" TEXT,"to" TEXT,"reason" TEXT,"created_at" TEXT,"released_at" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"),FOREIGN KEY(hostel_id,room_type_id) REFERENCES room_types(hostel_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,CHECK("to" > "from"),UNIQUE(id,hostel_id,room_type_id));

CREATE TABLE "unit_block_units" ("block_id" TEXT NOT NULL,"hostel_id" TEXT NOT NULL,"room_id" TEXT NOT NULL,"unit_id" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("block_id","unit_id"),FOREIGN KEY(block_id,hostel_id,room_id) REFERENCES unit_blocks(id,hostel_id,room_type_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,FOREIGN KEY(hostel_id,room_id,unit_id) REFERENCES physical_units(hostel_id,room_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "rental_inquiries" ("id" TEXT NOT NULL,"property_kind" TEXT NOT NULL DEFAULT 'rental' CHECK(property_kind='rental'),"property_id" TEXT NOT NULL,"tracking_code" TEXT NOT NULL UNIQUE,"private_token" TEXT NOT NULL UNIQUE,"property_title" TEXT,"guest_name" TEXT NOT NULL,"contact" TEXT NOT NULL,"request_type" TEXT NOT NULL,"desired_start_date" TEXT,"desired_duration_text" TEXT,"proposed_visit_date" TEXT,"notes" TEXT,"status" TEXT NOT NULL,"admin_notes" TEXT,"created_at" TEXT NOT NULL,"updated_at" TEXT NOT NULL,"residents_count" INTEGER, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"),FOREIGN KEY(property_kind,property_id) REFERENCES properties(kind,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "reviews" ("id" TEXT NOT NULL,"hostel_id" TEXT NOT NULL,"property_kind" TEXT NOT NULL DEFAULT 'hostel' CHECK(property_kind='hostel'),"booking_id" TEXT,"legacy_booking_id" TEXT,"hostel_name" TEXT,"guest_name" TEXT,"comment" TEXT NOT NULL,"status" TEXT NOT NULL,"admin_reply" TEXT,"created_at" TEXT NOT NULL,"rating" INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),"scores" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"),FOREIGN KEY(property_kind,hostel_id) REFERENCES properties(kind,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,FOREIGN KEY(booking_id,hostel_id) REFERENCES bookings(id,hostel_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,CHECK((booking_id IS NOT NULL) <> (legacy_booking_id IS NOT NULL)));

CREATE TABLE "articles" ("id" TEXT NOT NULL,"slug" TEXT NOT NULL,"title" TEXT NOT NULL,"summary" TEXT NOT NULL,"category" TEXT,"featured_image" TEXT,"content" TEXT NOT NULL,"author" TEXT,"language" TEXT NOT NULL,"status" TEXT NOT NULL,"last_verified_date" TEXT,"created_at" TEXT NOT NULL,"updated_at" TEXT NOT NULL,"is_sample_draft" INTEGER CHECK(is_sample_draft IN (0,1)),"tags" TEXT,"sources" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"));

CREATE TABLE "article_translations" ("article_id" TEXT NOT NULL,"language" TEXT NOT NULL CHECK(language IN ('fa','en','ru','hy')),"title" TEXT,"summary" TEXT,"content" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("article_id","language"),FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "phrases" ("id" TEXT NOT NULL,"category" TEXT,"category_label_fa" TEXT,"fa" TEXT,"en" TEXT,"ru" TEXT,"hy" TEXT,"phonetic_hy" TEXT,"note" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"));

CREATE TABLE "audit_logs" ("id" TEXT NOT NULL,"timestamp" TEXT,"actor_id" TEXT,"actor_name" TEXT,"actor_role" TEXT,"action" TEXT,"target_type" TEXT,"target_id" TEXT,"details" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"));

CREATE TABLE "booking_changes" ("id" TEXT NOT NULL,"booking_id" TEXT NOT NULL,"check_in" TEXT,"check_out" TEXT,"booking_version" TEXT,"property_version" TEXT,"reason" TEXT,"requested_by" TEXT,"created_at" TEXT,"guest_accepted_at" TEXT,"status" TEXT,"guests_count" INTEGER,"quantity" INTEGER,"amount_amd" INTEGER,"difference_amd" INTEGER,"pricing" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"),FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "support_threads" ("id" TEXT NOT NULL,"booking_id" TEXT NOT NULL,"category" TEXT NOT NULL,"status" TEXT NOT NULL,"created_at" TEXT NOT NULL,"updated_at" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"),FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "support_messages" ("thread_id" TEXT NOT NULL,"id" TEXT NOT NULL,"at" TEXT NOT NULL,"actor_id" TEXT,"role" TEXT,"text" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("thread_id","id"),FOREIGN KEY(thread_id) REFERENCES support_threads(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "finance_entries" ("id" TEXT NOT NULL,"booking_id" TEXT NOT NULL,"hostel_id" TEXT NOT NULL,"kind" TEXT NOT NULL,"reason" TEXT,"actor_id" TEXT,"created_at" TEXT NOT NULL,"request_id" TEXT NOT NULL,"amount_amd" INTEGER NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("id"),FOREIGN KEY(booking_id,hostel_id) REFERENCES bookings(id,hostel_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,UNIQUE(booking_id,request_id));

CREATE TABLE "saved_places" ("user_id" TEXT NOT NULL,"place" TEXT NOT NULL, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("user_id","place"),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED);

CREATE TABLE "app_settings" ("key" TEXT NOT NULL,"value" TEXT, extras_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extras_json)), sort_order REAL NOT NULL DEFAULT 0, PRIMARY KEY("key"));

CREATE INDEX users_sort ON "users"(sort_order);

CREATE INDEX user_credentials_sort ON "user_credentials"(sort_order);

CREATE INDEX properties_sort ON "properties"(sort_order);

CREATE INDEX manager_properties_sort ON "manager_properties"(sort_order);

CREATE INDEX property_translations_sort ON "property_translations"(sort_order);

CREATE INDEX room_types_sort ON "room_types"(sort_order);

CREATE INDEX room_translations_sort ON "room_translations"(sort_order);

CREATE INDEX physical_units_sort ON "physical_units"(sort_order);

CREATE INDEX property_photos_sort ON "property_photos"(sort_order);

CREATE INDEX property_images_sort ON "property_images"(sort_order);

CREATE INDEX coupons_sort ON "coupons"(sort_order);

CREATE INDEX bookings_sort ON "bookings"(sort_order);

CREATE INDEX booking_events_sort ON "booking_events"(sort_order);

CREATE INDEX booking_units_sort ON "booking_units"(sort_order);

CREATE INDEX capacity_overrides_sort ON "capacity_overrides"(sort_order);

CREATE INDEX unit_blocks_sort ON "unit_blocks"(sort_order);

CREATE INDEX unit_block_units_sort ON "unit_block_units"(sort_order);

CREATE INDEX rental_inquiries_sort ON "rental_inquiries"(sort_order);

CREATE INDEX reviews_sort ON "reviews"(sort_order);

CREATE INDEX articles_sort ON "articles"(sort_order);

CREATE INDEX article_translations_sort ON "article_translations"(sort_order);

CREATE INDEX phrases_sort ON "phrases"(sort_order);

CREATE INDEX audit_logs_sort ON "audit_logs"(sort_order);

CREATE INDEX booking_changes_sort ON "booking_changes"(sort_order);

CREATE INDEX support_threads_sort ON "support_threads"(sort_order);

CREATE INDEX support_messages_sort ON "support_messages"(sort_order);

CREATE INDEX finance_entries_sort ON "finance_entries"(sort_order);

CREATE INDEX saved_places_sort ON "saved_places"(sort_order);

CREATE INDEX app_settings_sort ON "app_settings"(sort_order);

CREATE UNIQUE INDEX properties_slug ON properties(kind,slug) WHERE slug IS NOT NULL AND slug<>'';

CREATE INDEX properties_public ON properties(kind,is_published,listing_status,city);

CREATE INDEX properties_hostel_price ON properties(kind,is_published,min_price_per_night_amd);

CREATE INDEX properties_rental_price ON properties(kind,listing_status,price_per_month_amd);

CREATE INDEX room_types_price ON room_types(hostel_id,price_per_night_amd);

CREATE INDEX bookings_inventory ON bookings(hostel_id,room_type_id,status,check_out,check_in);

CREATE INDEX bookings_traveler ON bookings(traveler_user_id,created_at);

CREATE INDEX bookings_due ON bookings(status,expires_at);

CREATE INDEX bookings_hostel_status ON bookings(hostel_id,status,created_at);

CREATE INDEX bookings_hostel_active ON bookings(hostel_id,status,check_out);

CREATE INDEX bookings_checked_in ON bookings(hostel_id) WHERE status='confirmed' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL;

CREATE INDEX unit_blocks_inventory ON unit_blocks(hostel_id,room_type_id,released_at,"from","to");

CREATE INDEX reviews_public ON reviews(status,hostel_id,created_at);

CREATE INDEX reviews_booking ON reviews(booking_id);

CREATE INDEX articles_public ON articles(status,language,created_at);

CREATE UNIQUE INDEX articles_slug ON articles(slug) WHERE slug IS NOT NULL AND slug<>'';

CREATE INDEX audit_logs_recent ON audit_logs(timestamp DESC);

CREATE INDEX manager_properties_hostel ON manager_properties(hostel_id,user_id);

CREATE INDEX booking_changes_booking ON booking_changes(booking_id,status);

CREATE INDEX support_threads_booking ON support_threads(booking_id,status);

CREATE INDEX finance_entries_hostel ON finance_entries(hostel_id,created_at);

CREATE INDEX rental_inquiries_status ON rental_inquiries(status,created_at);

CREATE INDEX property_photos_url ON property_photos(url);

CREATE INDEX property_images_url ON property_images(url);

CREATE INDEX articles_image ON articles(featured_image);

CREATE INDEX properties_entrance_image ON properties(json_extract(extras_json,'$.entrancePhoto'));

CREATE INDEX media_assets_created ON media_assets(created_at);

CREATE INDEX outbox_dispatch ON outbox(status,next_attempt,created_at);

CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE INDEX sessions_user ON sessions(user_id);

CREATE INDEX auth_tokens_user ON auth_tokens(user_id,purpose);

CREATE INDEX auth_tokens_expiry ON auth_tokens(expires_at);

CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
