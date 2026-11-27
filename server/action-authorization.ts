import type { User } from "../src/types/index.js";
import {
  requirePermission,
  type Permission,
} from "../src/utils/authorization.js";
// Every exposed action must have an explicit policy. Resource/token checks remain
// in native domain services; adding an action without a policy fails closed.
export const actionPolicies: Record<string, Permission | "public"> = {};
function group(policy: Permission | "public", names: string) {
  for (const name of names.split(" ")) actionPolicies[name] = policy;
}
group(
  "public",
  "login logout registerTraveler requestPasswordRecovery resetPassword verifyEmail translateText checkCoupon createBooking cancelBookingByGuest reportEntranceIssue submitReview createRentalInquiry applyForJob trackApplication bookTour trackTour requestService requestBookingChange acceptBookingChange createSupportThread replySupportThread resolveSupportThread",
);
group(
  "account.self",
  "requestEmailVerification changePassword logoutAll updateProfile mergeSavedPlaces toggleAccountSaved claimGuestBooking",
);
group(
  "platform.admin",
  "saveHostel saveRental setRentalStatus toggleRentalAvailability setVerification createHostelManager toggleManagerActive addCoupon toggleCoupon deleteCoupon moderateReview updateRentalInquiryStatus saveArticle deleteArticle notificationStatus sendNotifications updatePlatformSettings saveProvider",
);
group(
  "services.manage",
  "saveService deleteService saveServiceCategory deleteServiceCategory updateServiceRequest",
);
group("accounts.assign", "setAccountAccess");
group(
  "hostels.manage",
  "updateBookingStatus setCapacity setHostelStatus toggleHostelPublished updateHostelLocation updateArrivalGuide recordExternalBooking assignUnits blockUnits releaseUnitBlock recordStayEvent applyBookingChange rejectBookingChange recordFinanceEntry",
);
group("jobs.manage", "saveJob deleteJob reviewApplication");
group("tours.manage", "saveTour deleteTour changeTourBooking");
export function authorizeAction(user: User | null, action: string) {
  const policy = actionPolicies[action];
  if (!policy) throw new Error("دسترسی مجاز نیست.");
  if (policy !== "public") requirePermission(user, policy);
}

group('account.self','saveSeekerProfile saveSeekerJob withdrawJobApplication revokeApplicationSharing deleteSeekerDocument deleteSeekerProfile');

group('jobs.manage','saveEmployerOrganization saveRecruitmentJob closeRecruitmentJob renewRecruitmentJob saveRecruitmentNote scheduleRecruitmentInterview finishRecruitmentInterview');

group('platform.admin','moderateContent');
