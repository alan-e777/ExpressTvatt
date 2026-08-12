/**
 * Admin roles.
 *
 * `developer` is not assignable — it belongs to the bootstrap `ADMIN_UID` alone
 * and is applied for display. It carries exactly the same authority as
 * `huvudadmin`; the separate label exists so the owner's account does not read
 * as "the main admin" to anyone glancing at the panel.
 */
export type AdminRole = "developer" | "huvudadmin" | "admin";

export const ROLE_LABELS: Record<AdminRole, string> = {
  developer:  "Developer",
  huvudadmin: "Huvudadmin",
  admin:      "Admin",
};

/** Roles an admin can actually be given from the dashboard. */
export const ASSIGNABLE_ROLES: AdminRole[] = ["huvudadmin", "admin"];

export const DEFAULT_ROLE: AdminRole = "admin";

/**
 * Whether this role may add, remove, reset passwords for, and re-role other
 * admins. Plain `admin` accounts see the list read-only, so a staff login
 * cannot quietly grant itself or anyone else more authority.
 */
export function canManageAdmins(role: AdminRole): boolean {
  return role === "developer" || role === "huvudadmin";
}

/** Narrow an arbitrary stored value to a known role. */
export function toRole(value: unknown): AdminRole {
  return value === "huvudadmin" || value === "admin" || value === "developer"
    ? value
    : DEFAULT_ROLE;
}
