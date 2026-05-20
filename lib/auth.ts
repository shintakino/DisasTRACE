import { createClient } from "./supabase-server";
import { UserRole } from "@/types/users";

/**
 * Get the current user's role from Supabase app_metadata.
 * Defaults to 'public_user' if no role is set.
 */
export async function getUserRole(): Promise<UserRole> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return 'public_user';
  }

  const role = user.app_metadata?.role as UserRole | undefined;

  if (!role) {
    console.warn(`[Auth Warning] Role missing in Supabase user app_metadata for user ${user.id}`);
    return 'public_user';
  }

  return role;
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
