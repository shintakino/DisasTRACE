# DisasTRACE - Fresh Deployment & Initial Setup Guide

This guide is designed for developers who want to deploy a fresh instance of **DisasTRACE** with a clean database (schema-only, zero mock incidents, zero telemetry noise, and pre-seeded default settings/admin accounts).

---

## 📋 Prerequisites

Ensure you have the following accounts and tools ready:
1. **Node.js** (v18 or higher) & **npm** (v10 or higher).
2. **PostgreSQL Database** with **PostGIS** extension (e.g., Supabase PostgreSQL project).
3. **Supabase Project** (providing Auth, Database, Storage, and Realtime).
4. **Textbee.dev Account** (for sending OTP verification SMS codes in production).

---

## ⚙️ Step 1: Environment Variables Configuration

Create a file named `.env.local` in the root directory and copy-paste the template below, replacing placeholders with your official keys:

```ini
# Next Auth / Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-in

# Database Connection (Postgres Pooler port 6543)
DATABASE_URL="postgresql://postgres.project_ref:db_password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Supabase Configurations
NEXT_PUBLIC_SUPABASE_URL=https://project_ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SMS Gateway (textbee.dev)
TEXTBEE_API_KEY=your_textbee_api_key
TEXTBEE_DEVICE_ID=your_textbee_registered_device_id

# Developer / Simulation Mode Toggle
# Set to 'false' for strict production behavior and SMS dispatches
NEXT_PUBLIC_DEV_MODE=false
```

---

## 🚀 Step 2: Running the Automated Setup Script

We have written an orchestration script that automates the setup sequence in a single command. It will execute the following steps in order:
1. Re-run migrations to initialize clean table structures.
2. Establish custom database triggers, procedures, and notifications.
3. Configure PostGIS spatial dimensions and GiST location indexes.
4. Provision public storage buckets (such as `avatars`) and configure Storage RLS policies.
5. Enable Supabase Realtime replication on active tables.
6. Enforce global Row-Level Security (RLS) policies.
7. Seed default FAQs, Emergency Hotlines, support contact numbers, and Baliwag City hospital lists.
8. Seed the four essential developer test accounts (`admin@disastrace.com`, `pacc@disastrace.com`, `responder@disastrace.com`, and `user@disastrace.com`).

To trigger the automated orchestrator, run the following command in the root folder:

```bash
npm run db:setup
```

### Script Execution Logs:
Upon starting, you will see clean output showing the execution status of each module:
```bash
====================================================
        DisasTRACE Fresh Deployment Setup           
====================================================

🚀 Running: tsx scripts/migrate.ts...
✅ Completed: migrate.ts

🚀 Running: tsx scripts/setup-db-functions.ts...
✅ Completed: setup-db-functions.ts

...

====================================================
🎉 Fresh Database Setup Completed Successfully!    
   All tables initialized with zero dynamic records.
====================================================
```

---

## 📱 Step 3: Mobile App Configuration

For other developers working on the mobile application (`/mobile` directory):

1. **Install Dependencies**:
   ```bash
   cd mobile
   npm install
   ```
2. **Environment Variables**:
   Create a `.env` file inside the `mobile/` directory:
   ```ini
   EXPO_PUBLIC_SUPABASE_URL=https://project_ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_DEV_MODE=false
   ```
3. **Launch Mobile Development Server**:
   ```bash
   npm run start
   ```

---

## 🧹 Step 4: Deleting or Resetting (For Dev Environments Only)

If you are working in a local development environment and need to completely drop all schemas, delete auth caches, purge all storage file assets, and re-run all migrations from scratch, use the reset command:

> [!WARNING]
> This command drops all custom database schemas/tables, deletes all authenticated Supabase users, and **recursively purges all uploaded assets inside the `avatars`, `user-ids`, and `reports` Storage buckets**. Do not run this on production databases.

```bash
npm run db:reset
```

---

## 🛡️ Security Checklists

1. **Storage Buckets**: The automated script configures buckets for `user-ids` and `avatars`. Ensure that the `user-ids` bucket remains **private** so that government ID uploads are never exposed directly to the public web.
2. **Supabase service_role key**: Ensure that `SUPABASE_SERVICE_ROLE_KEY` is **never** added to public repositories, and is only loaded on secure hosting environments like Vercel dashboard.
