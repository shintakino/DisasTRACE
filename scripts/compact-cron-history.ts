import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

type RelationSize = {
  object: string;
  bytes: string;
  pretty: string;
};

function databaseUrl() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const url = new URL(process.env.DATABASE_URL);
  url.port = process.env.CRON_RETENTION_POOLER_PORT || '5432';
  return url.toString();
}

async function relationSizes(sql: postgres.Sql): Promise<RelationSize[]> {
  return sql<RelationSize[]>`
    SELECT
      'net._http_response' AS object,
      pg_total_relation_size('net._http_response')::text AS bytes,
      pg_size_pretty(pg_total_relation_size('net._http_response')) AS pretty
    UNION ALL
    SELECT
      'cron.job_run_details' AS object,
      pg_total_relation_size('cron.job_run_details')::text AS bytes,
      pg_size_pretty(pg_total_relation_size('cron.job_run_details')) AS pretty
  `;
}

async function waitForEmptyQueue(sql: postgres.Sql) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const queue = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM net.http_request_queue
    `;
    if ((queue[0]?.count ?? 0) === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error('The pg_net request queue did not drain within 30 seconds; compaction was not started.');
}

async function compact() {
  const apply = process.argv.includes('--apply');
  const sql = postgres(databaseUrl(), {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    ssl: 'require',
  });

  try {
    const [scheduler, before] = await Promise.all([
      sql<{ active: boolean }[]>`
        SELECT active FROM cron.job WHERE jobname = 'dispatch-offer-expiry'
      `,
      relationSizes(sql),
    ]);
    if (scheduler.length !== 1 || !scheduler[0]?.active) {
      throw new Error('The active dispatch-offer-expiry job was not found; compaction was not started.');
    }
    await waitForEmptyQueue(sql);

    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', before }, null, 2));
    if (!apply) return;

    // VACUUM FULL has an exclusive lock only on these internal diagnostic
    // tables. A short lock timeout avoids delaying the active scheduler if a
    // pg_net/cron writer is currently using one of them.
    await sql.unsafe("SET lock_timeout TO '10s'");
    await sql.unsafe("SET statement_timeout TO '2min'");
    await sql.unsafe('VACUUM (FULL, ANALYZE) net._http_response');
    await sql.unsafe('VACUUM (FULL, ANALYZE) cron.job_run_details');

    console.log(JSON.stringify({ after: await relationSizes(sql) }, null, 2));
  } finally {
    await sql.end({ timeout: 10 });
  }
}

compact().catch((error) => {
  console.error('Cron-history compaction failed:', error);
  process.exitCode = 1;
});
