import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function simulateApiResponses() {
  const { db } = await import('../db');
  const { sql, eq, and, gte, desc } = await import('drizzle-orm');
  const { incidents } = await import('../db/schema/incidents');
  const { users } = await import('../db/schema/users');
  const { verificationRequests } = await import('../db/schema/verification_requests');

  console.log('--- Simulating Dashboard API Responses ---\n');

  // 1. Simulate /api/dashboard/kpis
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [incidentsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(gte(incidents.createdAt, todayStart));

  const [respondersCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, "ambulance_responder"), eq(users.status, "ACTIVE")));

  const [resolvedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(and(eq(incidents.status, "RESOLVED"), gte(incidents.resolvedAt, todayStart)));

  const kpiData = {
    totalIncidentsToday: incidentsCount?.count || 0,
    totalResponders: respondersCount?.count || 0,
    totalResolvedToday: resolvedCount?.count || 0,
    avgResponseTime: "9",
  };
  
  console.log('KPI Response data:');
  console.log(JSON.stringify(kpiData, null, 2));
  console.log('Types:');
  for (const [key, value] of Object.entries(kpiData)) {
    console.log(`  ${key}: ${typeof value} = ${value}`);
  }

  // 2. Test Zod validation
  const { z } = await import('zod');
  
  const KpiDataSchema = z.object({
    totalIncidentsToday: z.number(),
    totalResponders: z.number(),
    totalResolvedToday: z.number(),
    avgResponseTime: z.string(),
  });

  console.log('\n--- Testing Zod Validation ---');
  try {
    const result = KpiDataSchema.parse(kpiData);
    console.log('✅ KPI Zod validation passed:', result);
  } catch (e: any) {
    console.error('❌ KPI Zod validation FAILED:', e.message);
    if (e.errors) {
      for (const err of e.errors) {
        console.error(`  Field: ${err.path.join('.')}, Expected: ${err.expected}, Got: ${err.received}, Message: ${err.message}`);
      }
    }
  }

  process.exit(0);
}

simulateApiResponses().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
