import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkDashboardDeps() {
  const { db } = await import('../db');
  const { sql } = await import('drizzle-orm');

  console.log('--- Checking Dashboard API Dependencies ---\n');

  // 1. Check all required tables exist
  const tables = ['users', 'incidents', 'verification_requests', 'notifications'];
  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT count(*) as cnt FROM "${table}"`));
      console.log(`✅ Table "${table}" exists, rows: ${result[0]?.cnt}`);
    } catch (e: any) {
      console.error(`❌ Table "${table}" MISSING or ERROR: ${e.message}`);
    }
  }

  // 2. Check columns on users table (duty_status was added in migration 0002)
  console.log('\n--- Checking users table columns ---');
  try {
    const cols = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    for (const col of cols) {
      console.log(`  ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    }
  } catch (e: any) {
    console.error('Error checking columns:', e.message);
  }

  // 3. Check columns on incidents table
  console.log('\n--- Checking incidents table columns ---');
  try {
    const cols = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'incidents' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    for (const col of cols) {
      console.log(`  ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    }
  } catch (e: any) {
    console.error('Error checking columns:', e.message);
  }

  // 4. Try running the exact queries the dashboard uses
  console.log('\n--- Testing Dashboard KPI Queries ---');
  try {
    const { incidents } = await import('../db/schema/incidents');
    const { users } = await import('../db/schema/users');
    const { eq, and, gte } = await import('drizzle-orm');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [incidentsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidents)
      .where(gte(incidents.createdAt, todayStart));
    console.log(`✅ KPI incidents query OK: ${incidentsCount?.count}`);

    const [respondersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, "ambulance_responder"), eq(users.status, "ACTIVE")));
    console.log(`✅ KPI responders query OK: ${respondersCount?.count}`);
  } catch (e: any) {
    console.error(`❌ KPI query FAILED: ${e.message}`);
  }

  // 5. Test verification_requests (used by trends)
  console.log('\n--- Testing Trends Query ---');
  try {
    const { verificationRequests } = await import('../db/schema/verification_requests');
    const result = await db
      .select({ type: verificationRequests.type, count: sql<number>`count(*)` })
      .from(verificationRequests)
      .groupBy(verificationRequests.type);
    console.log(`✅ Trends query OK: ${result.length} types found`);
  } catch (e: any) {
    console.error(`❌ Trends query FAILED: ${e.message}`);
  }

  // 6. Test reports query (incidents JOIN verification_requests)
  console.log('\n--- Testing Reports Query ---');
  try {
    const { incidents } = await import('../db/schema/incidents');
    const { verificationRequests } = await import('../db/schema/verification_requests');
    const { eq, desc } = await import('drizzle-orm');

    const result = await db
      .select({
        id: incidents.id,
        vehicleId: incidents.assignedAmbulance,
        destination: verificationRequests.locationDescription,
        createdAt: incidents.createdAt,
      })
      .from(incidents)
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .orderBy(desc(incidents.createdAt))
      .limit(10);
    console.log(`✅ Reports query OK: ${result.length} rows`);
  } catch (e: any) {
    console.error(`❌ Reports query FAILED: ${e.message}`);
  }

  // 7. Test responders query (uses db.query with relations)
  console.log('\n--- Testing Responders Query ---');
  try {
    const { users } = await import('../db/schema/users');
    const { eq, and } = await import('drizzle-orm');
    
    const dbResponders = await db.query.users.findMany({
      where: and(eq(users.role, "ambulance_responder"), eq(users.status, "ACTIVE")),
    });
    console.log(`✅ Responders query OK: ${dbResponders.length} responders`);
  } catch (e: any) {
    console.error(`❌ Responders query FAILED: ${e.message}`);
  }

  console.log('\n--- Done ---');
  process.exit(0);
}

checkDashboardDeps().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
