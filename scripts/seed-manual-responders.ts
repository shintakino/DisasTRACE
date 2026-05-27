import { createClient } from '@supabase/supabase-js';
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

interface SeedResponder {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  address: string;
}

const mockResponders: SeedResponder[] = [
  // CDRRMO HQ Responders
  {
    email: 'renzy@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_Renzy!',
    fullName: 'Bastes, Renzy',
    phone: '09671663201',
    address: 'Brgy. Poblacion, Baliwag',
  },
  {
    email: 'jericho@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_Jericho!',
    fullName: 'Mendoza, Jericho',
    phone: '09472344970',
    address: 'Brgy. Carpa, Baliwag',
  },
  // Barangay Rescue Units
  {
    email: 'sabang@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_Sabang!',
    fullName: 'Barangay Sabang Rescue',
    phone: '09758552900',
    address: 'Brgy. Sabang, Baliwag',
  },
  {
    email: 'carpa@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_Carpa!',
    fullName: 'Barangay Carpa Rescue',
    phone: '09472344970', // Same phone in database
    address: 'Brgy. Carpa, Baliwag',
  },
  {
    email: 'tibag@disastrace.com',
    password: 'DisasTRACE_Secure_Auth_2026_Tibag!',
    fullName: 'Barangay Tibag Rescue',
    phone: '09472344970', // Same phone in database
    address: 'Brgy. Tibag, Baliwag',
  },
];

async function seed() {
  console.log('--- Starting Mock Responder Seeding ---');

  let phoneCounter = 0;

  for (const account of mockResponders) {
    try {
      // Convert to E.164 format: e.g. 09671663201 -> +639671663201.
      // Append counter suffix digit or offset to prevent Supabase uniqueness collisions
      const baseNumber = account.phone.slice(1);
      const uniqueNumber = phoneCounter > 0 ? `${baseNumber.slice(0, -1)}${parseInt(baseNumber.slice(-1)) + phoneCounter}` : baseNumber;
      const e164Phone = `+63${uniqueNumber}`;
      phoneCounter++;

      // 1. Clean up existing auth user
      const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const existingAuthUser = authUsers.find(u => u.email === account.email);
      if (existingAuthUser) {
        console.log(`User ${account.email} already exists. Cleaning up...`);
        // Delete from public.users first
        await supabase.from('users').delete().eq('email', account.email);
        // Delete from auth
        await supabase.auth.admin.deleteUser(existingAuthUser.id);
      }

      // 2. Create user in auth.users
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        phone: e164Phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: account.fullName,
          phone: account.phone,
          address: account.address,
          role: 'ambulance_responder'
        }
      });

      if (createError) throw createError;
      if (!user) throw new Error('User creation failed');

      console.log(`Created auth user: ${account.email}`);

      // 3. Insert into public.users table
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          full_name: account.fullName,
          email: account.email,
          phone: account.phone,
          address: account.address,
          role: 'ambulance_responder',
          status: 'ACTIVE',
          verification_status: 'APPROVED',
          duty_status: 'ON_DUTY',
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`Error creating profile for ${account.email}:`, profileError);
      } else {
        console.log(`Created public profile and assigned ON_DUTY status for: ${account.fullName}`);
      }

    } catch (error) {
      console.error(`Error seeding ${account.email}:`, error);
    }
  }

  console.log('--- Seeding Mock Responders Complete ---');
}

seed().catch(console.error);
