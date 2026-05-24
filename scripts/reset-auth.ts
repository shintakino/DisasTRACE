import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAuth() {
  console.log('--- Resetting Supabase Auth Users ---');
  let deletedCount = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (error) {
      console.error('Error fetching users:', error);
      break;
    }
    
    if (!data.users || data.users.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const user of data.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Failed to delete user ${user.email} (${user.id}):`, deleteError);
      } else {
        console.log(`Deleted user: ${user.email} (${user.id})`);
        deletedCount++;
      }
    }
  }
  
  console.log(`--- Auth Reset Complete. Deleted ${deletedCount} users. ---`);
}

resetAuth().catch((err) => {
  console.error('Auth reset failed:', err);
  process.exit(1);
});
