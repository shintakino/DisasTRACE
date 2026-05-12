import { createClerkClient } from '@clerk/backend';
import { UserRole } from '../types/clerk';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

interface TestAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  publicMetadata: {
    role: UserRole;
    employeeId?: string;
  };
}

const testAccounts: TestAccount[] = [
  {
    email: 'admin@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_CDRRMO!',
    firstName: 'CDRRMO',
    lastName: 'Super Admin',
    phoneNumber: '+12015550001',
    publicMetadata: { role: 'cdrrmo_super_admin', employeeId: 'ADMIN-001' },
  },
  {
    email: 'pacc@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_PACC!',
    firstName: 'PACC',
    lastName: 'Dispatcher',
    phoneNumber: '+12015550002',
    publicMetadata: { role: 'pacc_admin', employeeId: 'PACC-001' },
  },
  {
    email: 'responder@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_Responder!',
    firstName: 'Ambulance',
    lastName: 'Responder',
    phoneNumber: '+12015550003',
    publicMetadata: { role: 'ambulance_responder' },
  },
  {
    email: 'user@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_User!',
    firstName: 'Public',
    lastName: 'User',
    phoneNumber: '+12015550004',
    publicMetadata: { role: 'public_user' },
  },
];

async function seed() {
  console.log('--- Starting Clerk User Seeding ---');

  for (const account of testAccounts) {
    try {
      // Check if user already exists
      const users = await clerkClient.users.getUserList({
        emailAddress: [account.email],
      });

      if (users.data.length > 0) {
        console.log(`User ${account.email} already exists. Deleting to recreate with bypass flags...`);
        await clerkClient.users.deleteUser(users.data[0].id);
      }

      // Create new user
      await clerkClient.users.createUser({
        emailAddress: [account.email],
        phoneNumber: [account.phoneNumber],
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        publicMetadata: account.publicMetadata as Record<string, unknown>,
        skipPasswordChecks: true,
      });

      console.log(`Created user: ${account.email} with role: ${account.publicMetadata.role}`);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error) {
        console.error(`Error seeding ${account.email}:`, (error as { status: number }).status);
      } else {
        console.error(`Error seeding ${account.email}:`, error);
      }
    }
  }

  console.log('--- Seeding Complete ---');
}

seed().catch(console.error);
