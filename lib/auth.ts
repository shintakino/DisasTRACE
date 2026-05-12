import { auth } from "@clerk/nextjs/server";
import { UserRole } from "@/types/clerk";

/**
 * Get the current user's role from Clerk metadata.
 * Defaults to 'public_user' if no role is set.
 */
export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata?.role as UserRole) || 'public_user';
}

/**
 * Check if the user has a specific role.
 */
export async function hasRole(role: UserRole | UserRole[]): Promise<boolean> {
  const userRole = await getUserRole();
  if (Array.isArray(role)) {
    return role.includes(userRole);
  }
  return userRole === role;
}

/**
 * Check if the user is an admin (PACC or CDRRMO).
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(['pacc_admin', 'cdrrmo_super_admin']);
}
