import {moderationDetail,moderateContent} from '../moderation.js';
import {contentModules,moderationStates,moderationTransitions,type ModerationStatus} from '../../src/types/moderation.js';
import {recruitmentAction} from '../recruitment.js';
import {emptySeekerProfile,saveSeekerProfile,uploadResume,seekerAction} from '../job-seekers.js';
import {syntheticResume} from '../resume-fixtures.js';
import type { Transaction } from "@libsql/client";
import type { Database } from "../database.js";
import type { AppStoreState } from "../domain.js";
import type {
  User,
  Hostel,
  RentalProperty,
  Article,
} from "../../src/types/index.js";
import { Store } from "../domain.js";
import { saveProvider, providerInput } from "../provider-accounts.js";
import { saveJob, jobInput } from "../job-postings.js";
import {
  applyForJob,
  applicationInput,
  reviewApplication,
} from "../job-applications.js";
import { saveTour, tourInput } from "../tours.js";
import { bookTour, bookingInput, changeTourBooking } from "../tour-bookings.js";
import { serviceAction, serviceActionSchemas } from "../services.js";
import { operate, operationSchemas } from "../operations.js";
import { addCalendarDays, yerevanToday } from "../../src/utils/dates.js";
import { uuid, type DemoPlan } from "./fixtures.js";
export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: "hostel_manager" | "traveler" | "job_provider" | "tour_provider";
  password: string;
}
const success = (result: { success: boolean; error?: string }) => {
  if (!result.success)
    throw Error(result.error ?? "Synthetic workflow failed.");
  return result;
};
export async function materialize(
  database: Database,
  state: AppStoreState,
  tx: Transaction,
  plan: DemoPlan,
  accounts: DemoAccount[],
  admin: User,
) {
  const c = plan.config.counts,
    base = plan.config.baseDate;
  if (base !== yerevanToday())
    throw Error(
      "Generate a fresh batch for today before import; existing historical data is never rewritten.",
    );
  let clock = new Date(base + "T08:00:00Z"),
    counter = 0,
    nextId: string | undefined;
  const identity = () => {
    const id = nextId;
    nextId = undefined;
    return id ?? uuid(plan.id, "runtime:" + counter++);
  };
  const store = new Store(state, true, {
    now: () => clock,
    id: identity,
    preserveAuditHistory: true,
  });
  const as = (actor: User | null) => {
    store.getState().currentUser = actor;
  };
  as(admin);
  const secret = (email: string) => {
    const account = accounts.find((a) => a.email === email);
    if (!account) throw Error("Protected account manifest is incomplete.");
    return account;
  };
  for (const hostel of plan.hostels) store.saveHostel(hostel as Hostel);
  for (const rental of plan.rentals) store.saveRental(rental as RentalProperty);
  for (const person of plan.managers) {
    as(admin);
    nextId = person.id;
    success(
      await store.createHostelManager({
        name: person.name,
        email: person.email,
        initialPassword: secret(person.email).password,
        assignedHostelIds: plan.hostels
          .filter((_, i) => i % c.managers === person.index)
          .map((h) => h.id),
      }),
    );
  }
  for (const person of plan.travelers) {
    nextId = person.id;
    success(
      await store.registerTraveler(
        person.name,
        person.email,
        undefined,
        secret(person.email).password,
      ),
    );
  }
  as(admin);
  for (const coupon of plan.coupons) success(store.addCoupon(coupon));
  for (const article of plan.articles) store.saveArticle(article as Article);
  const rooms = plan.hostels.flatMap((h) =>
    h.roomTypes.map((room) => ({ hostel: h, room })),
  );
  for (let i = 0; i < c.reservations; i++) {
    const { hostel, room } = rooms[i % rooms.length],
      traveler = store
        .getState()
        .users.find((u) => u.id === plan.travelers[i % c.travelers].id)!;
    const completed = i < c.reviews,
      date = completed
        ? addCalendarDays(
            base,
            -2 - 2 * Math.floor(i / Math.max(rooms.length, 1)),
          )
        : addCalendarDays(
            base,
            3 + Math.floor(i / Math.max(1, rooms.length) / 4) * 3,
          );
    clock = completed ? new Date(date + "T08:00:00Z") : new Date();
    as(traveler);
    nextId = uuid(plan.id, "reservation:" + i);
    const result = store.createBooking({
      hostelId: hostel.id,
      roomTypeId: room.id,
      guestName: traveler.name,
      contactType: "email",
      guestContact: traveler.email,
      checkIn: date,
      checkOut: addCalendarDays(date, 1),
      guestsCount: 1,
      quantity: 1,
      acceptedTerms: true,
      expectedHostelUpdatedAt: store
        .getState()
        .hostels.find((h) => h.id === hostel.id)!.updatedAt,
      idempotencyKey: uuid(plan.id, "stay-request:" + i),
      language: (["fa", "en", "ru", "hy"] as const)[i % 4],
      couponCode:
        plan.coupons.length && i % 4 === 0
          ? plan.coupons[i % plan.coupons.length].code
          : undefined,
    });
    success(result);
    if (!result.booking) throw Error("Booking was not returned.");
    const booking = store
      .getState()
      .bookings.find((b) => b.id === result.booking!.id)!;
    as(admin);
    if (completed) {
      success(store.updateBookingStatus(booking.id, "confirmed"));
      for (const [action, args] of [
        ["assignUnits", [booking.id, [room.physicalUnits![0].id]]],
        ["recordStayEvent", [booking.id, "check_in", "SYNTHETIC arrival"]],
      ] as const)
        success(
          await operate(store, action, operationSchemas[action].parse(args)),
        );
      clock = new Date(addCalendarDays(date, 1) + "T08:00:00Z");
      success(
        await operate(
          store,
          "recordStayEvent",
          operationSchemas.recordStayEvent.parse([
            booking.id,
            "check_out",
            "SYNTHETIC departure",
          ]),
        ),
      );
      as(traveler);
      success(
        store.submitReview(
          booking.privateToken,
          4,
          "SYNTHETIC review — fictional completed stay",
          { cleanliness: 4, safety: 4, staff: 4, location: 4 },
        ),
      );
      as(admin);
      if (i % 3 !== 0)
        store.moderateReview(
          store.getState().bookings.find((b) => b.id === booking.id)!.reviewId!,
          i % 3 === 1 ? "approved" : "rejected",
        );
    } else if (i % 4 !== 0)
      success(
        store.updateBookingStatus(
          booking.id,
          (["confirmed", "cancelled", "rejected"] as const)[i % 3],
          "SYNTHETIC test status",
        ),
      );
  }
  clock = new Date(base + "T08:00:00Z");
  for (let i = 0; i < c.rentalInquiries; i++) {
    as(null);
    const rental = plan.rentals[i % c.rentals],
      person = plan.travelers.length
        ? plan.travelers[i % plan.travelers.length]
        : {
            name: "SYNTHETIC Rental Guest " + i,
            email: `rental.${i}.${plan.id.slice(0, 8)}@example.test`,
          };
    const result = store.createRentalInquiry({
      propertyId: rental.id,
      guestName: person.name,
      contact: person.email,
      requestType: i % 2 ? "visit" : "rent",
      desiredStartDate: addCalendarDays(base, 7),
      desiredDurationText: "1 month",
      proposedVisitDate: addCalendarDays(base, 3) + "T14:00",
      residentsCount: 1,
      notes: "SYNTHETIC inquiry",
    });
    success(result);
    as(admin);
    if (!result.inquiry) throw Error("Missing rental inquiry");
    store.updateRentalInquiryStatus(
      result.inquiry.id,
      (
        [
          "pending_review",
          "coordinating",
          "agreed",
          "rejected",
          "cancelled",
          "completed",
        ] as const
      )[i % 6],
      "SYNTHETIC status",
    );
  }
  as(admin);
  // Vary publication only after dependent requests have passed normal open-listing rules.
  for (const [i, hostel] of plan.hostels.entries())
    if (i % 6 === 5) store.setHostelStatus(hostel.id, "draft");
  for (const [i, rental] of plan.rentals.entries())
    if (i % 6 === 5) store.setRentalStatus(rental.id, "hidden");
  Object.assign(state, store.getState());
  state.currentUser = null;
  await database.flush(state, tx);
  const providers = new Map<string, User>();
  for (const account of accounts.filter(
    (a) => a.role === "job_provider" || a.role === "tour_provider",
  )) {
    await saveProvider(
      tx,
      admin,
      providerInput.parse({
        name: account.name,
        email: account.email,
        password: account.password,
        phone: "",
        organization: "SYNTHETIC organization",
        role: account.role,
        isActive: true,
      }),
      () => account.id,
    );
    providers.set(account.email, {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      isActive: true,
      createdAt: base,
    });
  }
  for (const [i, job] of plan.jobs.entries()) {
    const actor = providers.get(plan.employers[i % c.employers].email)!;
    await saveJob(tx, actor, jobInput.parse(job));
    await saveJob(
      tx,
      admin,
      jobInput.parse({ ...job, version: 1, approved: true }),
    );
  }
  if(plan.version>=3)for(const account of plan.employers){const owner=providers.get(account.email)!;await recruitmentAction(tx,owner,'saveEmployerOrganization',[{ownerId:owner.id,version:0,name:'SYNTHETIC agency '+account.index,description:'Fictional recruitment organization for isolated tests only.',website:'https://example.test',phone:'',city:'Yerevan'}]);}
  const seekers=new Map<string,User>(),resumes=new Map<string,string>();
  if(plan.version>=2&&c.jobs>0)for(const [i,person]of plan.travelers.entries()){
    const user=state.users.find(u=>u.id===person.id)!;seekers.set(user.id,user);
    await saveSeekerProfile(tx,user,{...emptySeekerProfile(user),headline:'SYNTHETIC Hospitality professional',city:'Yerevan',about:'SYNTHETIC applicant — fictional experience only.',desiredRole:'Guest services',preferredLocation:'Yerevan',minimumSalary:180000,employmentTypes:['full_time'],remote:i%2===0,skills:['Customer service','Teamwork'],languages:[{code:'en',proficiency:'fluent'},{code:'fa',proficiency:'native'}],experience:[{id:uuid(plan.id,'experience:'+i),title:'SYNTHETIC Receptionist',organization:'Fictional agency',startDate:'2024-01',endDate:'2025-12',description:'Fictional guest support experience.'}],education:[{id:uuid(plan.id,'education:'+i),institution:'Fictional institute',qualification:'Hospitality certificate',startDate:'2022-09',endDate:'2023-06',description:'SYNTHETIC education.'}]});
    if(i<3)resumes.set(user.id,(await uploadResume(tx,user,syntheticResume('SYNTHETIC applicant '+i),'synthetic-resume.pdf','application/pdf')).id);
    for(const job of plan.jobs.slice(0,2))await seekerAction(tx,user,'saveSeekerJob',[job.id,true]);
  }
  for (let i = 0; i < c.jobApplications; i++) {
    const job = plan.jobs[i % c.jobs],
      person = plan.applicants[i % c.applicants];
    const applicant=plan.version>=2&&i<c.applicants&&person.applicantUserId?seekers.get(person.applicantUserId)??null:null;
    const reference = await applyForJob(
      tx,
      applicationInput.parse({
        requestId: uuid(plan.id, "job-request:" + i),
        jobId: job.id,
        version: 2,
        name: person.name,
        contact: person.email,
        message: "SYNTHETIC experience — no real application",
        ...(applicant?{consent:true,shareProfile:i%2===0,...(resumes.has(applicant.id)?{documentId:resumes.get(applicant.id)}:{})}:{}),
      }),applicant,
    );
    const status = (["received", "reviewing", "accepted", "declined"] as const)[
      i % 4
    ];
    if (status !== "received")
      await reviewApplication(
        tx,
        providers.get(plan.employers[(i % c.jobs) % c.employers].email)!,
        reference,
        "received",
        status,
      );
    if(plan.version>=3){const owner=providers.get(plan.employers[(i%c.jobs)%c.employers].email)!;const r=(await tx.execute({sql:'SELECT version FROM recruitment_applications WHERE reference=?',args:[reference]})).rows[0];await recruitmentAction(tx,owner,'saveRecruitmentNote',[reference,Number(r?.version??0),'SYNTHETIC private employer note. Not a real hiring decision.']);if(i%8===0)await reviewApplication(tx,owner,reference,'received','shortlisted');if(i%8===1){const date=addCalendarDays(base,7)+'T12:00:00.000Z';if(Date.parse(date)>Date.now())await recruitmentAction(tx,owner,'scheduleRecruitmentInterview',[{reference,previousStatus:'reviewing',previousId:null,startsAt:date,minutes:30,kind:'video',location:'SYNTHETIC interview proposal only; no real meeting or candidate confirmation.'}]);}}
  }
  for (const [i, job] of plan.jobs.entries())
    if (i % 5 === 4 || i % 7 === 6)
      await saveJob(
        tx,
        admin,
        jobInput.parse({
          ...job,
          version: 2,
          status: i % 5 === 4 ? "closed" : "open",
          approved: i % 7 !== 6,
        }),
      );
  if(plan.version>=3)for(const [i,job]of plan.jobs.entries()){if(i%11===10||i%13===12){const row=(await tx.execute({sql:'SELECT version,status FROM job_postings WHERE id=?',args:[job.id]})).rows[0];await recruitmentAction(tx,admin,'saveRecruitmentJob',[{job:{...job,version:Number(row.version),status:row.status},publication:i%11===10?'draft':'rejected',expiresAt:null,moderationNote:'SYNTHETIC moderation fixture.'}]);}}
  for (const [i, tour] of plan.tours.entries()) {
    await saveTour(
      tx,
      providers.get(plan.tourProviders[i % c.tourProviders].email)!,
      tourInput.parse(tour),
    );
    await saveTour(
      tx,
      admin,
      tourInput.parse({ ...tour, version: 1, approved: true }),
    );
  }
  for (let i = 0; i < c.tourBookings; i++) {
    const tour = plan.tours[i % c.tours],
      reference = await bookTour(
        tx,
        bookingInput.parse({
          requestId: uuid(plan.id, "tour-request:" + i),
          tourId: tour.id,
          tourVersion: 2,
          name: "SYNTHETIC Tour Guest " + (i + 1),
          contact: `tourguest.${i}.${plan.id.slice(0, 8)}@example.test`,
          travelDate: addCalendarDays(
            base,
            7 + Math.floor(i / Math.max(c.tours, 1)),
          ),
          guests: 1 + (i % 3),
          notes: "SYNTHETIC booking",
        }),
      );
    const status = (["pending", "confirmed", "cancelled"] as const)[i % 3];
    if (status !== "pending")
      await changeTourBooking(
        tx,
        providers.get(
          plan.tourProviders[(i % c.tours) % c.tourProviders].email,
        )!,
        reference,
        "pending",
        status,
      );
  }
  for (const [i, tour] of plan.tours.entries())
    if (i % 5 === 4)
      await saveTour(
        tx,
        admin,
        tourInput.parse({ ...tour, version: 2, hidden: true, approved: true }),
      );
  for (const service of plan.services)
    await serviceAction(
      tx,
      admin,
      "saveService",
      serviceActionSchemas.saveService.parse([service]),
    );
  for (let i = 0; i < c.serviceRequests; i++) {
    const service = plan.services[i % c.services];
    const result = await serviceAction(
      tx,
      null,
      "requestService",
      serviceActionSchemas.requestService.parse([
        {
          requestId: uuid(plan.id, "service-request:" + i),
          serviceId: service.id,
          version: 1,
          name: "SYNTHETIC Service Guest " + (i + 1),
          contact: `serviceguest.${i}.${plan.id.slice(0, 8)}@example.test`,
          preferredDate: addCalendarDays(base, 5),
          note: "SYNTHETIC appointment inquiry",
        },
      ]),
    );
    if (i % 3)
      await serviceAction(
        tx,
        admin,
        "updateServiceRequest",
        serviceActionSchemas.updateServiceRequest.parse([
          result.serviceReference,
          "new",
          i % 3 === 1 ? "contacted" : "closed",
        ]),
      );
  }
  for (const [i, service] of plan.services.entries())
    if (i % 6 === 5)
      await serviceAction(
        tx,
        admin,
        "saveService",
        serviceActionSchemas.saveService.parse([
          { ...service, version: 1, isActive: false },
        ]),
      );
  for (const [i, coupon] of plan.coupons.entries())
    if (i % 5 === 4) {
      as(admin);
      store.toggleCoupon(coupon.code);
    }
  Object.assign(state, store.getState());
  state.currentUser = null;
  await database.flush(state, tx);
  if(plan.version>=4){
    const ids={hostel:plan.hostels.map(x=>x.id),rental:plan.rentals.map(x=>x.id),job:plan.jobs.map(x=>x.id),tour:plan.tours.map(x=>x.id),service:plan.services.map(x=>x.id),article:plan.articles.map(x=>x.id),review:state.reviews.map(x=>x.id)};
    for(const module of contentModules)for(const [index,status] of moderationStates.entries()){
      const id=ids[module][index];if(!id)continue;
      let current=await moderationDetail(tx,admin,module,id);
      const paths:ModerationStatus[][]=[[current.status]],seen=new Set<ModerationStatus>();let path:ModerationStatus[]|undefined;
      while(paths.length){const candidate=paths.shift()!,last=candidate.at(-1)!;if(last===status){path=candidate;break;}if(seen.has(last))continue;seen.add(last);for(const next of moderationTransitions[last])paths.push([...candidate,next]);}
      if(!path)throw Error('Synthetic moderation state is unreachable.');
      for(const next of path.slice(1)){
        await moderateContent(tx,admin,{targets:[{module,id,version:current.version,contentVersion:current.contentVersion}],status:next,note:'SYNTHETIC moderation fixture; no real business decision.',confirmed:true});
        current=await moderationDetail(tx,admin,module,id);
      }
    }
  }
}
