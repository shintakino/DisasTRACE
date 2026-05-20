import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('Checking connection...');
  const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error checking users table:', error);
  } else {
    console.log('Users table exists. Row count:', count);
  }

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error checking auth users:', authError);
  } else {
    console.log('Auth users count:', authUsers.users.length);
    console.log('Auth users emails:', authUsers.users.map(u => u.email));
  }
}

check().catch(console.error);
