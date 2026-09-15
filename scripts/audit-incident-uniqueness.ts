import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const client = postgres(process.env.DATABASE_URL, { max: 1 });
const duplicates = await client`
  SELECT request_id, COUNT(*)::int AS count,
    json_agg(json_build_object(
      'id', id,
      'status', status,
      'responderId', responder_id,
      'offerResponderId', current_offer_responder_id,
      'dispatchMethod', dispatch_method,
      'createdAt', created_at,
      'resolvedAt', resolved_at
    ) ORDER BY created_at DESC, id DESC) AS incidents
  FROM incidents
  GROUP BY request_id
  HAVING COUNT(*) > 1
  ORDER BY request_id
`;
const reportDuplicates = await client`
  SELECT incident_id, COUNT(*)::int AS count,
    json_agg(json_build_object('id', id, 'status', status, 'createdAt', created_at) ORDER BY created_at DESC, id DESC) AS reports
  FROM reports
  GROUP BY incident_id
  HAVING COUNT(*) > 1
  ORDER BY incident_id
`;

console.log(JSON.stringify({ incidentDuplicates: duplicates, reportDuplicates }, null, 2));
await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
