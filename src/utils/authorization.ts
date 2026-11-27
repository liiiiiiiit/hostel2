import type { User, UserRole } from "../types/index.js";

export const permissions = [
  "account.self",
  "platform.admin",
  "accounts.assign",
  "hostels.manage",
  "jobs.manage",
  "tours.manage",
  "services.manage",
  "media.manage",
  "rentals.manage",
] as const;
export type Permission = (typeof permissions)[number];
export const rolePermissions: Record<UserRole, readonly Permission[]> = {
  admin: permissions,
  hostel_manager: ["account.self", "hostels.manage"],
  traveler: ["account.self"],
  job_provider: ["account.self", "jobs.manage"],
  tour_provider: ["account.self", "tours.manage"],
};
/** UI hints and domain policy share one vocabulary. Only the server hydrates
 * legacyProviderRoles; never accept an authorization principal from a payload. */
export function can(
  user: User | null | undefined,
  permission: Permission,
): boolean {
  if (!user?.isActive) return false;
  return (
    !!rolePermissions[user.role]?.includes(permission) ||
    (permission === "rentals.manage" && user.rentalOwnerAuthorized===true) ||
    (permission === "jobs.manage" &&
      !!user.legacyProviderRoles?.includes("job_provider")) ||
    (permission === "tours.manage" &&
      !!user.legacyProviderRoles?.includes("tour_provider"))
  );
}
export function managesHostel(
  user: User | null | undefined,
  id: string,
): boolean {
  return (
    can(user, "platform.admin") ||
    (can(user, "hostels.manage") && !!user?.assignedHostelIds?.includes(id))
  );
}
export function ownsResource(
  user: User | null | undefined,
  permission: Permission,
  ownerId: string,
): boolean {
  return (
    can(user, "platform.admin") ||
    (can(user, permission) && user?.id === ownerId)
  );
}
export function requirePermission(
  user: User | null | undefined,
  permission: Permission,
): asserts user is User {
  if (!can(user, permission)) throw new Error("دسترسی مجاز نیست.");
}
