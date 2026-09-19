/**
 * Guide Client Live (PG-030-GCL) Permission System
 *
 * Staff permission: "Can Guide Clients Live"
 * Only authorized Waypoint employees may see or use Guide Client Live.
 * Employees without this permission must not see the button or access a guidance session.
 */

export const PERMISSION_CAN_GUIDE_CLIENTS_LIVE = "Can Guide Clients Live";

export interface UserLike {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  publicMetadata?: Record<string, any>;
}

/**
 * Determines whether the user has the "Can Guide Clients Live" permission.
 * - System Admins, Master Coaches, and Advocates have this permission by default
 * - Custom employee permission overrides are respected via user.permissions or metadata
 */
export function canGuideClientsLive(user?: UserLike | null): boolean {
  if (!user) return false;

  // Check explicit permissions list if present
  if (Array.isArray(user.permissions)) {
    if (user.permissions.includes(PERMISSION_CAN_GUIDE_CLIENTS_LIVE)) {
      return true;
    }
  }

  // Check metadata permissions if using Clerk publicMetadata
  const metaPerms = user.publicMetadata?.permissions;
  if (Array.isArray(metaPerms) && metaPerms.includes(PERMISSION_CAN_GUIDE_CLIENTS_LIVE)) {
    return true;
  }

  // Standard roles: admin, master coach, advocate, staff
  const normalizedRole = (user.role || "").toLowerCase();
  if (
    normalizedRole === "admin" ||
    normalizedRole === "master coach" ||
    normalizedRole === "advocate" ||
    normalizedRole === "staff"
  ) {
    return true;
  }

  return false;
}
