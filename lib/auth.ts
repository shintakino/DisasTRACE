import { auth } from "@clerk/nextjs/server";
import { UserRole } from "@/types/clerk";

/**
 * Get the current user's role from Clerk metadata.
 * Defaults to 'public_user' if no role is set.
 */
export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  
  // The role is expected to be mapped from publicMetadata.role to metadata.role in the JWT template
  const role = sessionClaims?.metadata?.role as UserRole | undefined;
  
  if (!role) {
    const metadataStr = sessionClaims?.metadata ? JSON.stringify(sessionClaims.metadata) : "none";
    console.warn(`[Auth Warning] Role missing in JWT. Claims received: ${metadataStr}`);
    console.info("[Auth Info] To fix: Go to Clerk Dashboard > Sessions > Edit JWT Template and add: { \"metadata\": \"{{user.public_metadata}}\" }");
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
