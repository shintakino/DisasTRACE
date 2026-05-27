import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function enableRealtime() {
  console.log('--- Enabling Supabase Realtime for Verification Requests and Incidents ---');
  
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');

    console.log('Adding tables to supabase_realtime publication...');
    
    // In Supabase, the supabase_realtime publication is used to manage tables that broadcast via WebSockets.
    // Sometimes tables are already added, so we run them individually and catch specific exceptions.
    
    try {
      await db.execute(sql.raw('alter publication supabase_realtime add table verification_requests;'));
      console.log('✅ Successfully added verification_requests to supabase_realtime');
    } catch (e: any) {
      console.error('❌ Failed to add verification_requests. Raw error:', e);
    }

    try {
      await db.execute(sql.raw('alter publication supabase_realtime add table incidents;'));
      console.log('✅ Successfully added incidents to supabase_realtime');
    } catch (e: any) {
      console.error('❌ Failed to add incidents. Raw error:', e);
    }

    console.log('--- Realtime Enablement Complete ---');
  } catch (error) {
    console.error('Fatal error executing Realtime SQL:', error);
  } finally {
    process.exit(0);
  }
}

enableRealtime().catch(console.error);
