import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

type Column = {
  tableName: string;
  columnName: string;
  dataType: string;
};

type Range = {
  notificationCount: number;
  firstNotificationAt: string | null;
  lastNotificationAt: string | null;
  statusLogCount: number;
};

async function audit() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

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
        AND table_name IN ('notifications', 'status_logs')
        AND column_name IN ('created_at', 'incident_id')
      ORDER BY table_name, column_name
    `;
    const [ranges] = await sql<Range[]>`
      SELECT
        (SELECT count(*)::int FROM notifications) AS "notificationCount",
        (SELECT min(created_at)::text FROM notifications) AS "firstNotificationAt",
        (SELECT max(created_at)::text FROM notifications) AS "lastNotificationAt",
        (SELECT count(*)::int FROM status_logs) AS "statusLogCount"
    `;

    console.log(JSON.stringify({ timezone: timezone?.timezone, columns, ranges }, null, 2));
  } finally {
    await sql.end();
  }
}

audit().catch((error) => {
  console.error("Public timeline storage audit failed:", error);
  process.exit(1);
});
