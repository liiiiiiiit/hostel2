import { createHash } from "node:crypto";
import { z } from "zod";
import { newHostel, newRental } from "../../src/utils/properties.js";
import { addCalendarDays, yerevanToday } from "../../src/utils/dates.js";
import { hostelSchema, rentalSchema } from "../property-schemas.js";
import { jobInput } from "../job-postings.js";
import { tourInput } from "../tours.js";
import { serviceInput } from "../services.js";
import { articleSchema } from "../article-schema.js";

import {
  defaultDemoCounts as defaults,
  demoGroups as groups,
  type Counts,
} from "../../src/types/demo.js";
export { defaults, groups };
export type { Counts };
const safeText = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .refine(
    (s) => !/[<>@]|https?:|www\.|(?:\+?\d[\s().-]?){7}/i.test(s),
    "Enrichment accepts plain fictional text, not markup, contacts or URLs.",
  );
const contentSchema = z.object({
  fa: safeText,
  en: safeText,
  ru: safeText,
  hy: safeText,
});
export const configSchema = z
  .object({
    seed: z.string().trim().min(1).max(80).default("yerevanhub-task03"),
    baseDate: z.iso.date().default(() => yerevanToday()),
    modules: z
      .array(
        z.enum([
          "stays",
          "rentals",
          "jobs",
          "tours",
          "services",
          "articles",
          "coupons",
        ]),
      )
      .min(1)
      .max(7)
      .default(() => Object.keys(groups) as (keyof typeof groups)[])
      .refine((v) => new Set(v).size === v.length),
    counts: z
      .object(
        Object.fromEntries(
          Object.keys(defaults).map((k) => [
            k,
            z.number().int().min(0).max(3000).optional(),
          ]),
        ) as { [K in keyof Counts]: z.ZodOptional<z.ZodNumber> },
      )
      .strict()
      .default({}),
    content: z
      .partialRecord(
        z.enum(["hostels", "rentals", "jobs", "tours", "services", "articles"]),
        z.array(contentSchema).max(100),
      )
      .default({}),
  })
  .strict();
export type DemoConfig = z.output<typeof configSchema> & { counts: Counts };
export function uuid(seed: string, key: string) {
  const bytes = createHash("sha256")
    .update(seed + "\0" + key)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 0x40;
  bytes[8] = (bytes[8] & 63) | 0x80;
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function localized(fa: string, en: string, ru: string, hy: string) {
  return { fa, en, ru, hy };
}
export function fictional(kind: string, index: number) {
  return localized(
    `آزمایشی — ${kind} ${index + 1}`,
    `SYNTHETIC — ${kind} ${index + 1}`,
    `ТЕСТ — ${kind} ${index + 1}`,
    `ՓՈՐՁՆԱԿԱՆ — ${kind} ${index + 1}`,
  );
}
export function normalizeConfig(value: unknown): DemoConfig {
  const parsed = configSchema.parse(value),
    counts = { ...defaults, ...parsed.counts };
  for (const [group, keys] of Object.entries(groups))
    if (!parsed.modules.includes(group as keyof typeof groups))
      for (const key of keys) counts[key] = 0;
  const requireCount = (child: keyof Counts, parent: keyof Counts) => {
    if (counts[child] && !counts[parent])
      throw Error(`${child} requires ${parent}`);
  };
  for (const [child, parent] of [
    ["managers", "hostels"],
    ["hostels", "managers"],
    ["hostels", "roomTypes"],
    ["roomTypes", "hostels"],
    ["reservations", "hostels"],
    ["reservations", "travelers"],
    ["reviews", "reservations"],
    ["rentalInquiries", "rentals"],
    ["jobs", "employers"],
    ["employers", "jobs"],
    ["jobApplications", "jobs"],
    ["jobApplications", "applicants"],
    ["tours", "tourProviders"],
    ["tourProviders", "tours"],
    ["tourBookings", "tours"],
    ["serviceRequests", "services"],
  ] as [keyof Counts, keyof Counts][])
    requireCount(child, parent);
  if (
    counts.managers > counts.hostels ||
    counts.roomTypes < counts.hostels ||
    counts.roomTypes > counts.hostels * 50 ||
    counts.reviews > counts.reservations ||
    counts.applicants > counts.jobApplications
  )
    throw Error(
      "Counts cannot produce complete ownership, rooms or eligible reviews/applicants.",
    );
  if (counts.reservations > counts.roomTypes * 80)
    throw Error(
      "Reservation count exceeds the supported 89-day inventory horizon.",
    );
  if (Object.values(counts).reduce((n, c) => n + c, 0) > 10000)
    throw Error("Maximum 10000 primary records per batch.");
  return { ...parsed, counts } as DemoConfig;
}
export function generatePlan(input: unknown,recipeVersion:1|2=2) {
  const config = normalizeConfig(input),
    key = JSON.stringify(config),
    id = uuid("yh-demo-v"+recipeVersion, key),
    c = config.counts;
  const uid = (kind: string, i = 0) => uuid(id, kind + ":" + i),
    stamp = config.baseDate + "T08:00:00.000Z";
  const imageId = uid("image"),
    image = "/api/app?media=" + imageId;
  const list = <T>(count: number, f: (i: number) => T) =>
    Array.from({ length: count }, (_, i) => f(i));
  const email = (kind: string, i: number) =>
    `${kind}.${i + 1}.${id.slice(0, 8)}@example.test`;
  const description = (kind: keyof typeof config.content, i: number) =>
    config.content[kind]?.[i] ??
    localized(
      "این داده ساختگی فقط برای آزمون است؛ نشانی و خدمات واقعی نیست.",
      "Fictional test listing only. Not a real business or address.",
      "Вымышленная запись для теста. Не реальная организация или адрес.",
      "Սա փորձնական տվյալ է, ոչ իրական բիզնես կամ հասցե։",
    );
  const hostels = list(c.hostels, (i) => {
    const hostel = newHostel(),
      roomCount =
        Math.floor(c.roomTypes / c.hostels) +
        (i < c.roomTypes % c.hostels ? 1 : 0);
    Object.assign(hostel, {
      id: uid("hostel", i),
      slug: `demo-${id.slice(0, 8)}-hostel-${i + 1}`,
      name: fictional("Hostel", i),
      description: description("hostels", i),
      city: "Yerevan",
      district: ["Kentron", "Arabkir", "Ajapnyak"][i % 3],
      address: fictional("Test address", i),
      addressArmenianForTaxi:
        "Փորձնական հասցե — մի օգտագործեք ճանապարհորդության համար",
      coordinates: { lat: 40.18 + i / 10000, lng: 44.51 + i / 10000 },
      coordinatesProvided: true,
      phone: "TEST-NO-PHONE",
      email: email("hostel", i),
      directionsFa: "نشانی ساختگی برای تست",
      directionsEn: "Synthetic test directions",
      directionsRu: "Тестовое направление",
      directionsHy: "Փորձնական ուղղություն",
      reception24h: true,
      checkInStandardTime: "14:00",
      checkOutStandardTime: "11:00",
      languagesSpoken: ["fa", "en", "ru", "hy"],
      factsConfirmed: true,
      sampleContent: false,
      isPublished: true,
      listingStatus: "published",
      cancellationRule: { freeBeforeHours: 24, penaltyPercent: 0 },
      responseMinutes: 180,
      createdAt: stamp,
      updatedAt: stamp,
    });
    hostel.amenities = {
      ...hostel.amenities,
      wifi: true,
      kitchen: true,
      hotWater24h: true,
      linenIncluded: true,
      lockers: true,
      coworking: i % 2 === 0,
    };
    hostel.rules = {
      ...hostel.rules,
      quietHours: "22:00–08:00",
      cancellationPolicy: "Synthetic cancellation policy",
      cancellationPolicyLocalized: fictional("Cancellation policy", 0),
      acceptedPaymentMethodsOnArrival: ["AMD cash"],
    };
    hostel.roomTypes = list(roomCount, (r) => ({
      id: uid(`room-${i}`, r),
      name: fictional("Room", r),
      description: fictional("Room details", r),
      type: (["dorm_mixed", "dorm_female", "dorm_male", "private"] as const)[
        r % 4
      ],
      bookingUnit: r % 4 === 3 ? ("room" as const) : ("bed" as const),
      maxGuestsPerUnit: r % 4 === 3 ? 2 : 1,
      totalBedsOrRooms: 4,
      pricePerNightAMD: r % 4 === 3 ? 18000 : 4500 + 500 * (i % 4),
      physicalUnits: list(4, (u) => ({
        id: uid(`unit-${i}-${r}`, u),
        label: `TEST-${r + 1}-${u + 1}`,
      })),
    }));
    hostel.minPricePerNightAMD = Math.min(
      ...hostel.roomTypes.map((r) => r.pricePerNightAMD),
    );
    hostel.media = [
      { id: imageId, url: image, alt: fictional("Placeholder", 0) },
    ];
    hostel.photos = [image];
    return hostelSchema.parse(hostel);
  });
  const rentals = list(c.rentals, (i) => {
    const rental = newRental();
    Object.assign(rental, {
      id: uid("rental", i),
      slug: `demo-${id.slice(0, 8)}-rental-${i + 1}`,
      title: fictional("Apartment", i),
      description: description("rentals", i),
      city: "Yerevan",
      neighborhood: "Kentron",
      approximateLocationLabel: "Synthetic location",
      addressPublic: "Test address — not a real property",
      addressExactInternal: "SYNTHETIC-PRIVATE",
      areaSqm: 45 + i,
      maxResidents: 3,
      bedsCount: 3,
      bedroomsCount: 1,
      bathroomsCount: 1,
      floor: 2,
      totalFloors: 5,
      isFurnished: true,
      pricePerNightAMD: 20000 + i * 500,
      minStayNights: 1,
      depositTerms: "Synthetic refundable deposit",
      factsConfirmed: true,
      status: "published",
      createdAt: stamp,
      updatedAt: stamp,
    });
    rental.media = [
      { id: imageId, url: image, alt: fictional("Placeholder", 0) },
    ];
    rental.photos = [image];
    return rentalSchema.parse(rental);
  });
  const people = (kind: string, count: number) =>
    list(count, (i) => ({
      id: uid(kind, i),
      name: `SYNTHETIC ${kind} ${i + 1}`,
      email: email(kind, i),
      index: i,
    }));
  const travelers=people("traveler",c.travelers);
  const jobs = list(c.jobs, (i) =>
    jobInput.parse({
      id: uid("job", i),
      version: 0,
      title: `SYNTHETIC ${["Hospitality assistant", "Software support", "Cafe assistant"][i % 3]} ${i + 1}`,
      company: `SYNTHETIC Employer ${(i % c.employers) + 1}`,
      location: "Yerevan",
      schedule: i % 2 ? "Part-time" : "Full-time",
      description: description("jobs", i).en,
      contact: email("employer", i % c.employers),
      salary: 200000 + (i % 6) * 50000,
      period: "month",
      status: "open",
    }),
  );
  const tours = list(c.tours, (i) =>
    tourInput.parse({
      id: uid("tour", i),
      version: 0,
      title: `SYNTHETIC ${["Sevan", "Garni", "Dilijan", "Geghard"][i % 4]} ${i + 1}`,
      organizer: `SYNTHETIC Organizer ${(i % c.tourProviders) + 1}`,
      destination: ["Sevan", "Garni", "Dilijan", "Geghard"][i % 4],
      departure: "Yerevan — synthetic meeting point",
      schedule: "Synthetic scheduled day trip",
      duration: "1 day",
      description: description("tours", i).en,
      contact: email("organizer", i % c.tourProviders),
      price: 15000 + i * 500,
      published: true,
      hidden: false,
      capacity: 20,
    }),
  );
  const services = list(c.services, (i) =>
    serviceInput.parse({
      id: uid("service", i),
      slug: `demo-${id.slice(0, 8)}-service-${i + 1}`,
      categoryId: `00000000-0000-4000-8000-${String((i % 6) + 1).padStart(12, "0")}`,
      version: 0,
      isActive: true,
      isFeatured: i % 3 === 0,
      isVerified: false,
      allowBookingRequest: true,
      title: fictional(
        [
          "Dental clinic",
          "Cafe",
          "Translation office",
          "Wellness",
          "Exchange",
          "Other service",
        ][i % 6],
        i,
      ),
      shortDescription: description("services", i),
      description: description("services", i),
      address: fictional("Test address", i),
      workingHours: localized(
        "دوشنبه تا جمعه ۹–۱۷",
        "Mon–Fri 09–17",
        "Пн–Пт 09–17",
        "Երկ–Ուրբ 09–17",
      ),
      priceRange: fictional("Test price tier", i % 3),
      coverImage: image,
      gallery: [image],
      phone: "",
      whatsapp: "",
      telegram: "",
      instagram: "",
      website: "",
      city: "Yerevan",
      district: "Kentron",
      mapUrl: "",
      latitude: null,
      longitude: null,
      languagesSpoken: ["fa", "en", "ru", "hy"],
      highlights: [fictional("Synthetic test listing", 0)],
    }),
  );
  const articles = list(c.articles, (i) =>
    articleSchema.parse({
      id: uid("article", i),
      slug: `demo-${id.slice(0, 8)}-article-${i + 1}`,
      title: fictional("Guide", i).fa,
      summary: description("articles", i).fa,
      content: description("articles", i).fa,
      category: "synthetic",
      featuredImage: image,
      author: "SYNTHETIC editorial team",
      language: "fa",
      status: i % 4 === 0 ? "draft" : "published",
      lastVerifiedDate: "",
      createdAt: stamp,
      updatedAt: stamp,
      isSampleDraft: true,
      tags: ["synthetic", "testing"],
      sources: [],
      translations: Object.fromEntries(
        (["en", "ru", "hy"] as const).map((lang) => [
          lang,
          {
            title: fictional("Guide", i)[lang],
            summary: description("articles", i)[lang],
            content: description("articles", i)[lang],
          },
        ]),
      ),
    }),
  );
  return {
    version: recipeVersion,
    id,
    config,
    imageId,
    hostels,
    rentals,
    jobs,
    tours,
    services,
    articles,
    managers: people("manager", c.managers),
    travelers,
    employers: people("employer", c.employers),
    applicants: people("applicant", c.applicants).map((person,i)=>recipeVersion===2&&i<c.travelers?{...travelers[i],applicantUserId:uid("traveler",i)}:person as typeof person & {applicantUserId?:string}),
    tourProviders: people("organizer", c.tourProviders),
    coupons: list(c.coupons, (i) => ({
      code: `DEMO-${id.slice(0, 8)}-${i + 1}`.toUpperCase(),
      percent: 5 + (i % 5) * 5,
      minAmountAMD: 0,
      maxUses: 10000,
      usedCount: 0 as const,
      active: true,
      startsAt: addCalendarDays(config.baseDate, -90),
      expiresAt: addCalendarDays(config.baseDate, 90),
      description: "SYNTHETIC test coupon",
    })),
  };
}
export type DemoPlan = ReturnType<typeof generatePlan>;
export const planHash = (plan: DemoPlan) =>
  createHash("sha256").update(JSON.stringify(plan)).digest("hex");
