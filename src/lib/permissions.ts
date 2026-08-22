/**
 * Role + permission model for The Students Hub.
 *
 * Roles are stored in PostgreSQL on the user row and never trusted from the
 * client. This module is the single place that maps a role to what it may do,
 * so new roles or permissions only need an entry here.
 */

export type Role = "user" | "manager" | "admin";

export const ROLES: Role[] = ["user", "manager", "admin"];

export const ROLE_LABEL: Record<Role, string> = {
  user: "Member",
  manager: "Manager",
  admin: "Admin",
};

export type Permission =
  /** Club management: announcements, notes, events, tasks, suggestions, home layout, funds… */
  | "manage:content"
  /** Members page — view, edit, promote and delete accounts. */
  | "manage:members"
  /** Monitoring page — full activity log across the club. */
  | "view:monitoring";

const MATRIX: Record<Role, Permission[]> = {
  user: [],
  manager: ["manage:content"],
  admin: ["manage:content", "manage:members", "view:monitoring"],
};

export function normalizeRole(role: string | null | undefined): Role {
  return role === "admin" || role === "manager" ? role : "user";
}

export function can(role: string | null | undefined, permission: Permission) {
  return MATRIX[normalizeRole(role)].includes(permission);
}

/** True for managers and admins — anyone with club-management powers. */
export function isStaff(role: string | null | undefined) {
  return can(role, "manage:content");
}
