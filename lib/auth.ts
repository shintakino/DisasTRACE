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

  let role = user.app_metadata?.role as UserRole | undefined;

  if (!role) {
    try {
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema/users");
      const { eq } = await import("drizzle-orm");
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });
      if (dbUser?.role) {
        role = dbUser.role as UserRole;
      }
    } catch (dbErr) {
      console.error("[Auth Error] Failed to query user role fallback:", dbErr);
    }
  }

  return role || 'public_user';
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
