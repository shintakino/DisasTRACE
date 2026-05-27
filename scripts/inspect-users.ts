import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log('--- Inspecting auth.users ---');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }
  for (const u of authUsers.users) {
    console.log(`Email: ${u.email}`);
    console.log(`  ID: ${u.id}`);
    console.log(`  App Metadata:`, JSON.stringify(u.app_metadata));
    console.log(`  User Metadata:`, JSON.stringify(u.user_metadata));
  }

  console.log('\n--- Inspecting public.users ---');
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('*');
  if (publicError) {
    console.error('Error fetching public users:', publicError);
    return;
  }
  for (const u of publicUsers) {
    console.log(`Email: ${u.email}`);
    console.log(`  ID: ${u.id}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Status: ${u.status}`);
    console.log(`  Verification: ${u.verification_status}`);
    console.log(`  Duty Status: ${u.duty_status}`);
    console.log(`  Coordinates: (${u.last_latitude}, ${u.last_longitude})`);
  }
}

inspect().catch(console.error);
