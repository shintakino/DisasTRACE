export type UserRole = 'public_user' | 'ambulance_responder' | 'pacc_admin' | 'cdrrmo_super_admin';

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: UserRole;
    };
  }

  interface UserPublicMetadata {
    role?: UserRole;
  }
}
