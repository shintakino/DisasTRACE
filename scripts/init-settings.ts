import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function initSettings() {
  console.log('--- Initializing System Settings Table & Default Row ---');
  
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');

    // 1. Double check and create table if not already created by drizzle-kit push
    console.log('Verifying system_settings table existence...');
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(50) PRIMARY KEY,
        dispatch_offer_timeout_seconds INTEGER NOT NULL DEFAULT 30,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `));
    console.log('✅ Table verified successfully.');

    // 2. Insert default configuration row
    console.log('Inserting default system settings row...');
    await db.execute(sql.raw(`
      INSERT INTO system_settings (id, dispatch_offer_timeout_seconds, updated_at)
      VALUES ('current', 30, NOW())
      ON CONFLICT (id) DO NOTHING;
    `));
    console.log('✅ Default settings row initialized successfully.');

    console.log('--- System Settings Initialization Complete ---');
  } catch (error) {
    console.error('❌ Error executing initialization SQL:', error);
  } finally {
    process.exit(0);
  }
}

initSettings().catch(console.error);
