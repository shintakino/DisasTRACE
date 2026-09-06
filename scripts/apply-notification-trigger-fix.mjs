import fs from 'node:fs/promises';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const source = await fs.readFile('scripts/setup-db-functions.ts', 'utf8');
const match = source.match(/(CREATE OR REPLACE FUNCTION public\.generate_database_notifications[\s\S]*?\n\s*\$\$ language plpgsql security definer;)/i);
if (!match) throw new Error('Notification trigger SQL was not found.');
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
await sql.unsafe(match[1]);
const [verification] = await sql`select pg_get_functiondef('public.generate_database_notifications()'::regprocedure) as definition`;
if (!verification.definition.includes('new.resident_id is not null')) {
  throw new Error('Guest-safe resident notification guard was not persisted.');
}
await sql.end();
console.log('Guest-safe notification trigger applied.');
