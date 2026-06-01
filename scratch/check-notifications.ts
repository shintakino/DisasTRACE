import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('--- Checking notifications in Database ---');
  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('*, users(email, role, full_name)');
  
  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }
  
  console.log(`Total notifications found: ${notifs?.length || 0}`);
  if (notifs) {
    for (const n of notifs) {
      console.log(`[${n.type}] To: ${n.users?.full_name} (${n.users?.role}) - Email: ${n.users?.email}`);
      console.log(`  Title: ${n.title}`);
      console.log(`  Body: ${n.body}`);
      console.log(`  Unread: ${n.unread}`);
      console.log(`  Created: ${n.created_at}`);
      console.log('-----------------------------');
    }
  }
}

check().catch(console.error);
