import test from "node:test";
import assert from "node:assert/strict";
import { bookingReport, selectAdminBookings, uniqueArticleSlug } from "./admin";
import type { Booking } from "../types";

function booking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    trackingCode: `TRACK-${id}`,
    guestName: "Ani",
    guestContact: "guest@example.com",
    hostelName: "Kentron",
    roomTypeName: "Private room",
    checkIn: "2030-01-10",
    checkOut: "2030-01-12",
    createdAt: `2030-01-0${id}T12:00:00Z`,
    status: "confirmed",
    privateToken: "secret-bearer-link",
    quantity: 1,
    guestsCount: 2,
    finalAmountAMD: 20000,
    ...overrides,
  } as Booking;
}

test("admin results apply combined filters, search codes and dates, and sort without mutating state", () => {
  const records = [
    booking("1"),
    booking("2", { status: "pending", guestName: "Mariam" }),
    booking("3", { entranceIssueReported: true }),
  ];
  assert.deepEqual(
    selectAdminBookings(records, {}).map((b) => b.id),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    records.map((b) => b.id),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    selectAdminBookings(records, {
      status: "pending",
      query: "  MARIAM  ",
    }).map((b) => b.id),
    ["2"],
  );
  assert.deepEqual(
    selectAdminBookings(records, { query: "track-1" }).map((b) => b.id),
    ["1"],
  );
  assert.equal(selectAdminBookings(records, { query: "2030-01-12" }).length, 3);
  assert.equal(selectAdminBookings(records, { query: "unknown" }).length, 0);
});

test("arrival filters exclude departures and resolved arrival issues even when dates match", () => {
  const records = [
    booking("1", {
      checkIn: "2030-01-09",
      checkOut: "2030-01-10",
      entranceIssueReported: true,
    }),
    booking("2", { entranceIssueReported: true }),
    booking("3", { entranceIssueReported: true, status: "completed" }),
  ];
  assert.deepEqual(
    selectAdminBookings(records, {
      arrivalsOn: "2030-01-10",
      issuesOnly: true,
    }).map((b) => b.id),
    ["2"],
  );
  assert.deepEqual(
    selectAdminBookings(records, { issuesOnly: true, status: "pending" }),
    [],
  );
});

test("JSON reports preserve operational amounts but omit private links and nested access instructions", () => {
  const record = booking("1", {
    agreement: {
      cancellationPolicy: "PRIVATE-DOOR-CODE",
    } as Booking["agreement"],
    versionToken: "INTERNAL-VERSION",
    requestFingerprint: "INTERNAL-FINGERPRINT",
  });
  const [report] = bookingReport([record]);
  assert.equal(report.finalAmountAMD, 20000);
  assert.equal(report.guestContact, "guest@example.com");
  const json = JSON.stringify(report);
  for (const secret of [
    "secret-bearer-link",
    "PRIVATE-DOOR-CODE",
    "INTERNAL-VERSION",
    "INTERNAL-FINGERPRINT",
  ])
    assert.ok(!json.includes(secret));
  assert.ok(!("privateToken" in report));
});

test("new guides receive unique Unicode slugs including repeated titles and punctuation-only titles", () => {
  assert.equal(
    uniqueArticleSlug(" Hello, Yerevan! ", [
      { slug: "hello-yerevan" },
      { slug: "hello-yerevan-2" },
    ]),
    "hello-yerevan-3",
  );
  assert.equal(uniqueArticleSlug("راهنمای ایروان", []), "راهنمای-ایروان");
  assert.equal(uniqueArticleSlug("!!!", [{ slug: "guide" }]), "guide-2");
  assert.ok(uniqueArticleSlug("x".repeat(600), []).length <= 500);
});
