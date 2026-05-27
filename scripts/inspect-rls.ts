import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectRls() {
  console.log('--- Inspecting Database Row-Level Security (RLS) ---');
  
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');

    // 1. Check which tables have RLS enabled
    const rlsTables = await db.execute(sql.raw(`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `));
    
    console.log('\nTable RLS Status:');
    console.table(rlsTables);

    // 2. Fetch all RLS policies
    const policies = await db.execute(sql.raw(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `));

    console.log('\nRLS Policies:');
    if (policies.length === 0) {
      console.log('(No policies defined)');
    } else {
      console.table(policies);
    }

  } catch (error) {
    console.error('Error inspecting RLS:', error);
  } finally {
    process.exit(0);
  }
}

inspectRls().catch(console.error);
