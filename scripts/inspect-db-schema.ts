import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectTriggers() {
  console.log('--- Inspecting Database Triggers and Functions ---');
  
  try {
    // Dynamically import db after dotenv has run
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');

    // 1. Get all triggers
    const triggers = await db.execute(sql`
      SELECT 
        tgname AS trigger_name,
        relname AS table_name,
        proname AS function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE relname IN ('users', 'auth_users') OR tgname LIKE '%sync%' OR tgname LIKE '%auth%';
    `);
    console.log('Triggers found:', JSON.stringify(triggers, null, 2));

    // 2. Get function sources for our triggers
    const functions = await db.execute(sql`
      SELECT 
        proname AS function_name,
        prosrc AS definition
      FROM pg_proc
      WHERE proname IN ('handle_update_user_role_and_status', 'handle_new_user_profile');
    `);
    
    for (const fn of functions) {
      console.log(`\nFunction: ${fn.function_name}`);
      console.log(`Definition:\n${fn.definition}`);
    }

    // 3. Inspect public.users table contents
    const publicUsers = await db.execute(sql`
      SELECT id, email, role, status, verification_status FROM users;
    `);
    console.log('\npublic.users contents:', JSON.stringify(publicUsers, null, 2));

  } catch (error) {
    console.error('Error inspecting database schema:', error);
  } finally {
    process.exit(0);
  }
}

inspectTriggers().catch(console.error);
