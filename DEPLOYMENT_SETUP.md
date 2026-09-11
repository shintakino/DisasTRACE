# DisasTRACE - Fresh Deployment and Initial Setup Guide

This guide deploys a clean DisasTRACE instance with the database schema,
security policies, storage, realtime, scheduler, default settings, and mobile
build configuration required by the CDRRMO and PACC workflows.

## Prerequisites

Prepare the following before starting:

1. Node.js 20 or newer and npm 10 or newer.
2. A Supabase project with PostgreSQL, PostGIS, Auth, Storage, Realtime,
   Vault, pg_cron, and pg_net available.
3. A TextBee account and connected gateway device for production OTP SMS.
4. A Vercel project for the Next.js API/dashboard.
5. An Expo/EAS project and the Android Firebase configuration file used by
   `mobile/app.json` (`mobile/google-services.json`).

## 1. Configure the server environment

Create `.env.local` in the repository root. Set the same values in the Vercel
project environment settings for the deployed server:

```ini
# Supabase and PostgreSQL
DATABASE_URL="postgresql://postgres.project_ref:db_password@POOLER_HOST:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL=https://project_ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Public dashboard URL used by password-recovery emails
APP_URL=https://disas-trace.vercel.app

# Server-only scheduler credential. Never expose this to the mobile app.
DISPATCH_SCHEDULER_SECRET=generate_a_long_random_secret

# Production SMS OTP gateway
TEXTBEE_API_KEY=your_textbee_api_key
TEXTBEE_DEVICE_ID=your_textbee_device_id

# Optional chatbot provider key, when chatbot AI is enabled
DEEPSEEK_API_KEY=your_deepseek_api_key

# Must be false in production. True enables deterministic development behavior.
NEXT_PUBLIC_DEV_MODE=false
```

Do not add `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, TextBee secrets, or the
scheduler secret to a public repository or any `EXPO_PUBLIC_*` variable.

## 2. Apply migrations and initialize the database

From the repository root:

```bash
npm install
npx tsx scripts/migrate.ts
npx tsx scripts/audit-database-migrations.ts
npm run db:setup
```

`0016_dispatch_offer_expiry_scheduler.sql` enables the server-authoritative
five-second offer-expiry scheduler. `0017_mobile_push_notifications.sql`
creates session-bound Expo push-token storage. `0018_guest_device_report_limit.sql`
adds the hashed Android device quota used by Guest Mode.

The audit must report zero unapplied canonical migrations, missing tables,
missing columns, missing indexes, or missing triggers. Run `npm run db:setup`
only against an intentionally fresh/development database because the seed
steps create developer accounts and default records.

## 3. Configure the dispatch-expiry scheduler

Generate a secret locally, then put it in both Vercel and Supabase Vault:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Set that exact output as `DISPATCH_SCHEDULER_SECRET` in Vercel. After the
deployment is live, run the following in the Supabase SQL editor, replacing
the URL and secret with the real values:

```sql
select vault.create_secret(
  'https://disas-trace.vercel.app/api/dispatch-engine',
  'dispatch_scheduler_url'
);

select vault.create_secret(
  'THE_EXACT_VERCEL_DISPATCH_SCHEDULER_SECRET',
  'dispatch_scheduler_secret'
);
```

Verify the job and its recent executions:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'dispatch-offer-expiry';

select *
from cron.job_run_details
order by start_time desc
limit 20;
```

The scheduler is the authority for an unanswered offer. The mobile countdown
is only a display; a responder can accept only while the server-side deadline
is still valid.

## 4. Configure the mobile app and push notifications

Create `mobile/.env` for local development:

```ini
EXPO_PUBLIC_API_URL=http://YOUR_DEVELOPMENT_HOST:3000
EXPO_PUBLIC_MOBILE_API_URL=http://YOUR_DEVELOPMENT_HOST:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://project_ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_DEV_MODE=false
```

For preview and production, update `mobile/eas.json` with the deployed API and
Supabase values. Keep `mobile/google-services.json` present and matched to the
Android package in `mobile/app.json`. Push notifications use Expo Push/FCM;
the server binds each token to the account's active mobile session and removes
it on sign-out or provider invalidation. No Firebase Admin service-account key
is required by this implementation.

Install and run locally:

```bash
cd mobile
npm install
npm run start
```

Build an Android preview or production artifact with EAS:

```bash
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
```

Test a physical Android device for background dispatch notifications, vibration,
notification-tap hydration, location permission, and the one-active-device
sign-in rule. Expo Go is not a substitute for testing push notifications or
Android background services in a release build.

## 5. Configure Supabase Auth redirects

In Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `https://disas-trace.vercel.app`
- `https://disas-trace.vercel.app/reset-password`
- `disastrace://reset-password`

The web URL serves dashboard recovery; the custom scheme opens the Android
resident/responder reset-password screen. Do not leave localhost as the
production Site URL.

## 6. Guest Mode and abuse controls

Guest reports require a valid Philippine mobile number and an Android
app-scoped device identifier. The server stores only a SHA-256 device digest,
never the raw identifier. The configurable `guest_reports_per_phone_limit`
applies independently to the normalized phone number and device digest, so
changing the phone number does not reset the same installed device's allowance.
Obvious repeated or sequential numbers such as `09123456789` and
`09999999999` are rejected at both the mobile and API boundaries. The chatbot
shows the GPS/device-record and false-report safety notice immediately before
phone submission.

This is an abuse-control signal, not hardware attestation. For stronger
resistance to modified/rooted clients, add server-verified Google Play
Integrity tokens bound to the report request before production launch.

## 7. Fresh development reset (never production)

The reset command drops custom schemas, deletes authenticated users, purges
development storage assets, and reruns setup. It is destructive and cannot be
undone:

```bash
npm run db:reset
```

## Security and release checklist

- Keep `user-ids` private; government ID files must not be public.
- Keep service-role, database, TextBee, AI, and scheduler secrets server-only.
- Set `NEXT_PUBLIC_DEV_MODE=false` before a production build.
- Confirm `npm run db:setup` was not run against production unless a clean seed
  was explicitly intended.
- Confirm the cron job is active and `cron.job_run_details` shows successful
  executions.
- Verify background push delivery with the app closed/locked.
- Verify an expired offer returns to PACC and cannot be accepted from a stale
  notification.
- Verify guest quota, rejected-report recovery, tracking, and the one-device
  mobile session rule with a release build.
