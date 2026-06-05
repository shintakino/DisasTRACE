import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const runScript = (scriptName: string) => {
  console.log(`\n🚀 Running: tsx scripts/${scriptName}...`);
  try {
    execSync(`npx tsx scripts/${scriptName}`, { stdio: 'inherit' });
    console.log(`✅ Completed: ${scriptName}`);
  } catch (error) {
    console.error(`❌ Failed: ${scriptName}`);
    process.exit(1);
  }
};

const setup = async () => {
  console.log('====================================================');
  console.log('        DisasTRACE Fresh Deployment Setup           ');
  console.log('====================================================');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  // 1. Run migrations to setup clean table schemas
  runScript('migrate.ts');

  // 2. Setup custom PL/pgSQL database functions & notifications triggers
  runScript('setup-db-functions.ts');

  // 3. Setup spatial PostGIS columns & GiST nearest-responder indexes
  runScript('run-spatial-setup.ts');

  // 4. Setup Storage Avatars Bucket & Storage RLS policies
  runScript('run-avatars-setup.ts');

  // 5. Enable Supabase Realtime publication streams on target tables
  runScript('enable-realtime.ts');

  // 6. Apply database-level Row Level Security (RLS) policies & schemas
  runScript('apply-rbac.ts');

  // 7. Seed emergency hotlines, support contacts, and dynamic FAQ accordions
  runScript('setup-support-db.ts');
  runScript('init-settings.ts');

  // 8. Seed Baliwag hospital directories
  runScript('init-hospitals.ts');

  // 9. Seed base authenticated test accounts (Admin, PACC, Responder, User)
  runScript('seed-supabase.ts');

  console.log('\n====================================================');
  console.log('🎉 Fresh Database Setup Completed Successfully!    ');
  console.log('   All tables initialized with zero dynamic records.');
  console.log('====================================================');
};

setup();
