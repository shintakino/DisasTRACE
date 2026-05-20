import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types/users';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: UserRole;
  employeeId?: string;
}

const testAccounts: TestAccount[] = [
  {
    email: 'admin@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_CDRRMO!',
    firstName: 'CDRRMO',
    lastName: 'Super Admin',
    phoneNumber: '+12015550001',
    role: 'cdrrmo_super_admin',
    employeeId: 'ADMIN-001',
  },
  {
    email: 'pacc@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_PACC!',
    firstName: 'PACC',
    lastName: 'Dispatcher',
    phoneNumber: '+12015550002',
    role: 'pacc_admin',
    employeeId: 'PACC-001',
  },
  {
    email: 'responder@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_Responder!',
    firstName: 'Ambulance',
    lastName: 'Responder',
    phoneNumber: '+12015550003',
    role: 'ambulance_responder',
  },
  {
    email: 'user@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_User!',
    firstName: 'Public',
    lastName: 'User',
    phoneNumber: '+12015550004',
    role: 'public_user',
  },
];

async function seed() {
  console.log('--- Starting Supabase User Seeding ---');

  for (const account of testAccounts) {
    try {
      // 1. Check if user already exists in auth.users or public.users
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const existingAuthUser = users.find(u => u.email === account.email);
      
      // Also check public.users
      const { data: existingPublicUser, error: publicFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', account.email)
        .single();

      if (existingAuthUser || existingPublicUser) {
        console.log(`User ${account.email} already exists. Cleaning up...`);
        
        // Delete from public.users first
        const { error: publicDeleteError } = await supabase
          .from('users')
          .delete()
          .eq('email', account.email);
        
        if (publicDeleteError) {
          console.warn(`Warning: Could not delete public profile for ${account.email}:`, publicDeleteError);
        }

        if (existingAuthUser) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(existingAuthUser.id);
          if (deleteError) throw deleteError;
        }
      }

      // 2. Create user in auth.users
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        phone: account.phoneNumber,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          first_name: account.firstName,
          last_name: account.lastName,
          role: account.role
        }
      });

      if (createError) throw createError;
      if (!user) throw new Error('User creation failed');

      console.log(`Created auth user: ${account.email}`);

      // 3. Insert into public.users table (Drizzle will handle the schema, but for seeding we can use the client directly)
      // Note: The trigger public.handle_update_user_role_and_status() will sync these to auth.users.raw_app_meta_data
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          full_name: `${account.firstName} ${account.lastName}`,
          email: account.email,
          role: account.role,
          status: 'ACTIVE',
          verification_status: 'APPROVED',
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`Error creating profile for ${account.email}:`, profileError);
      } else {
        console.log(`Created public profile and assigned role: ${account.role}`);
      }

    } catch (error: unknown) {
      console.error(`Error seeding ${account.email}:`, error);
    }
  }

  console.log('--- Seeding Complete ---');
}

seed().catch(console.error);
