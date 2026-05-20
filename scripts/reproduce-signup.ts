import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function reproduce() {
  const email = `test.repro.${Date.now()}@gmail.com`;
  const password = 'Password123!';

  console.log(`--- Attempt 1: Signing up ${email} ---`);
  const res1 = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: 'Test',
        last_name: 'User',
        role: 'public_user'
      }
    }
  });
  console.log('Res 1 User:', res1.data.user?.id);
  console.log('Res 1 Session:', !!res1.data.session);
  console.log('Res 1 Error:', res1.error?.message);

  console.log(`\n--- Attempt 2: Signing up ${email} again ---`);
  const res2 = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: 'Test',
        last_name: 'User',
        role: 'public_user'
      }
    }
  });
  console.log('Res 2 User:', res2.data.user?.id);
  console.log('Res 2 Session:', !!res2.data.session);
  console.log('Res 2 Error:', res2.error?.message);
}

reproduce().catch(console.error);
