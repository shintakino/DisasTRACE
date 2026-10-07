import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

type Column = {
  tableName: string;
  columnName: string;
  dataType: string;
};

type Range = {
  tableName: string;
  count: number;
  firstCreatedAt: string | null;
  lastCreatedAt: string | null;
};

type IndexDefinition = {
  indexDefinition: string;
};

async function audit() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const [timezone] = await sql<{ timezone: string }[]>`
      SELECT current_setting('TimeZone') AS timezone
    `;
    const columns = await sql<Column[]>`
      SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('audit_logs', 'reports', 'status_logs')
        AND column_name IN ('created_at', 'updated_at')
      ORDER BY table_name, column_name
    `;
    const ranges = await sql<Range[]>`
      SELECT 'audit_logs' AS "tableName", count(*)::int AS count,
        min(created_at)::text AS "firstCreatedAt", max(created_at)::text AS "lastCreatedAt"
      FROM audit_logs
      UNION ALL
      SELECT 'reports', count(*)::int,
        min(created_at)::text, max(created_at)::text
      FROM reports
      UNION ALL
      SELECT 'status_logs', count(*)::int,
        min(created_at)::text, max(created_at)::text
      FROM status_logs
      ORDER BY "tableName"
    `;
    const [reportIndex] = await sql<IndexDefinition[]>`
      SELECT pg_get_indexdef(indexrelid) AS "indexDefinition"
      FROM pg_index
      WHERE indexrelid = 'reports_incident_id_unique'::regclass
    `;

    console.log(JSON.stringify({ timezone: timezone?.timezone, columns, ranges, reportIndex }, null, 2));
  } finally {
    await sql.end();
  }
}

audit().catch((error) => {
  console.error("Operational timestamp storage audit failed:", error);
  process.exit(1);
});
