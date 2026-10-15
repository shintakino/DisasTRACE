import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

const RESPONSE_RETENTION = '15 minutes';
const CRON_HISTORY_RETENTION = '3 days';
const CLEANUP_JOB_NAME = 'disastrace-prune-cron-history';
const RESPONSE_CLEANUP_JOB_NAME = 'disastrace-prune-pg-net-responses';
const CRON_BATCH_SIZE = 10_000;

type CountRow = { count: number };

function databaseUrl() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const url = new URL(process.env.DATABASE_URL);
  // The Supabase session pooler completed database queries reliably during
  // this maintenance task; the configured transaction pooler did not.
  url.port = process.env.CRON_RETENTION_POOLER_PORT || '5432';
  return url.toString();
}

async function countEligibleRows(sql: postgres.Sql) {
  const [responses, cronDetails] = await Promise.all([
    sql<CountRow[]>`
      SELECT count(*)::int AS count
      FROM net._http_response
      WHERE created < now() - interval '15 minutes'
    `,
    sql<CountRow[]>`
      SELECT count(*)::int AS count
      FROM cron.job_run_details
      WHERE end_time < now() - interval '3 days'
    `,
  ]);

  return {
    responses: responses[0]?.count ?? 0,
    cronDetails: cronDetails[0]?.count ?? 0,
  };
}

async function prune() {
  const apply = process.argv.includes('--apply');
  const sql = postgres(databaseUrl(), {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    ssl: 'require',
  });

  try {
    const activeScheduler = await sql<{ active: boolean }[]>`
      SELECT active
      FROM cron.job
      WHERE jobname = 'dispatch-offer-expiry'
    `;
    if (activeScheduler.length !== 1 || !activeScheduler[0]?.active) {
      throw new Error('The active dispatch-offer-expiry cron job was not found; cleanup was not started.');
    }

    const before = await countEligibleRows(sql);
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', before }, null, 2));
    if (!apply) return;

    // Keep pg_net responses only long enough to inspect recent scheduler
    // failures. Supabase keeps pg_net.ttl as a platform-owned setting, so the
    // application-owned cron job below is the enforced retention boundary.

    // pg_cron never removes its own run history. Recreate only this dedicated
    // cleanup job; do not alter the active dispatch expiry scheduler.
    await sql`
      SELECT cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = ${CLEANUP_JOB_NAME}
    `;
    await sql`
      SELECT cron.schedule(
        ${CLEANUP_JOB_NAME},
        ${'17 3 * * *'},
        ${`DELETE FROM cron.job_run_details WHERE end_time < now() - interval '${CRON_HISTORY_RETENTION}';`}
      )
    `;
    await sql`
      SELECT cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = ${RESPONSE_CLEANUP_JOB_NAME}
    `;
    await sql`
      SELECT cron.schedule(
        ${RESPONSE_CLEANUP_JOB_NAME},
        ${'*/5 * * * *'},
        ${`DELETE FROM net._http_response WHERE created < now() - interval '${RESPONSE_RETENTION}';`}
      )
    `;

    const deletedResponses = await sql<{ id: number }[]>`
      DELETE FROM net._http_response
      WHERE created < now() - interval '15 minutes'
      RETURNING id
    `;

    let deletedCronDetails = 0;
    while (true) {
      const batch = await sql<{ runid: number }[]>`
        WITH stale_rows AS (
          SELECT ctid
          FROM cron.job_run_details
          WHERE end_time < now() - interval '3 days'
          LIMIT ${CRON_BATCH_SIZE}
        )
        DELETE FROM cron.job_run_details details
        USING stale_rows
        WHERE details.ctid = stale_rows.ctid
        RETURNING details.runid
      `;
      deletedCronDetails += batch.length;
      if (batch.length < CRON_BATCH_SIZE) break;
    }

    // Makes the reclaimed space available for reuse without taking the
    // exclusive table lock that VACUUM FULL would require.
    await sql.unsafe('VACUUM (ANALYZE) net._http_response');
    await sql.unsafe('VACUUM (ANALYZE) cron.job_run_details');

    const after = await countEligibleRows(sql);
    const ttl = await sql<{ setting: string }[]>`
      SELECT setting
      FROM pg_settings
      WHERE name = 'pg_net.ttl'
    `;
    console.log(JSON.stringify({
      deletedResponses: deletedResponses.length,
      deletedCronDetails,
      after,
      pgNetTtl: ttl[0]?.setting ?? null,
    }, null, 2));
  } finally {
    await sql.end({ timeout: 10 });
  }
}

prune().catch((error) => {
  console.error('Cron history pruning failed:', error);
  process.exitCode = 1;
});
