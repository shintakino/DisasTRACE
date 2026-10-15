import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

type RetentionRow = {
  total: number;
  eligible: number;
  oldest: string | null;
  newest: string | null;
};

async function inspect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const databaseUrl = new URL(process.env.DATABASE_URL);
  const poolerPort = process.env.CRON_RETENTION_POOLER_PORT;
  if (poolerPort) databaseUrl.port = poolerPort;

  const sql = postgres(databaseUrl.toString(), {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    ssl: 'require',
  });
  try {
    const [netRows, cronRows, jobs, pendingRequests, settings, relationSizes] = await Promise.all([
      sql<RetentionRow[]>`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE created < now() - interval '15 minutes')::int AS eligible,
          min(created)::text AS oldest,
          max(created)::text AS newest
        FROM net._http_response
      `,
      sql<RetentionRow[]>`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE end_time < now() - interval '3 days')::int AS eligible,
          min(start_time)::text AS oldest,
          max(start_time)::text AS newest
        FROM cron.job_run_details
      `,
      sql<{ jobid: number; jobname: string; schedule: string; active: boolean }[]>`
        SELECT jobid, jobname, schedule, active
        FROM cron.job
        ORDER BY jobid
      `,
      sql<{ pending_requests: number }[]>`
        SELECT count(*)::int AS pending_requests
        FROM net.http_request_queue
      `,
      sql<{ name: string; setting: string; unit: string | null }[]>`
        SELECT name, setting, unit
        FROM pg_settings
        WHERE name = 'pg_net.ttl'
      `,
      sql<{ object: string; bytes: string; pretty: string }[]>`
        SELECT
          'net._http_response' AS object,
          pg_total_relation_size('net._http_response')::text AS bytes,
          pg_size_pretty(pg_total_relation_size('net._http_response')) AS pretty
        UNION ALL
        SELECT
          'cron.job_run_details' AS object,
          pg_total_relation_size('cron.job_run_details')::text AS bytes,
          pg_size_pretty(pg_total_relation_size('cron.job_run_details')) AS pretty
      `,
    ]);

    console.log(JSON.stringify({
      netHttpResponse: netRows[0],
      cronRunDetails: cronRows[0],
      activeJobs: jobs,
      pendingHttpRequests: pendingRequests[0]?.pending_requests ?? 0,
      pgNetSettings: settings,
      internalLogSizes: relationSizes,
    }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

inspect().catch((error) => {
  console.error('Cron retention inspection failed:', error);
  process.exitCode = 1;
});
