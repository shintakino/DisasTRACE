import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function initHospitals() {
  console.log('--- Initializing Hospitals Table & Seeding Actual Baliwag Institutions ---');
  
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');

    // 1. Double check and create table if not already created by drizzle-kit push
    console.log('Verifying hospitals table existence...');
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        caters BOOLEAN NOT NULL DEFAULT TRUE,
        phone VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `));
    console.log('✅ Table verified successfully.');

    // 2. Seed/update the 5 actual major hospitals in Baliwag
    console.log('Seeding major Baliwag City hospitals...');
    await db.execute(sql.raw(`
      INSERT INTO hospitals (id, name, address, lat, lng, caters, phone, created_at, updated_at)
      VALUES 
      ('hosp-1', 'Allied Care Experts (ACE) Medical Center-Baliwag', 'Doña Remedios Trinidad Hwy, Pinagbarilan, Baliwag', 14.9664, 120.9145, TRUE, '(044) 795 3000', NOW(), NOW()),
      ('hosp-2', 'Castro Maternity Hospital & General Hospital', 'M. Ponce Street, Tibag, Baliwag', 14.9578, 120.9037, TRUE, '(044) 766 1462', NOW(), NOW()),
      ('hosp-3', 'Rugay General Hospital', 'M. Cruz Street, Carpa Village, Sabang, Baliwag', 14.9531, 120.9022, TRUE, '(044) 766 3457', NOW(), NOW()),
      ('hosp-4', 'De Jesus General Hospital', '5 B. Aquino Ave, Bagong Nayon, Baliwag', 14.9490, 120.8895, TRUE, '(044) 766 2314', NOW(), NOW()),
      ('hosp-5', 'Baliuag District Hospital', 'Carpa Village, Sabang, Baliwag', 14.9576, 120.8942, TRUE, '(044) 766 2516', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        caters = EXCLUDED.caters,
        phone = EXCLUDED.phone,
        updated_at = NOW();
    `));
    console.log('✅ 5 Baliwag hospitals seeded/synced successfully.');

    console.log('--- Hospitals Initialization Complete ---');
  } catch (error) {
    console.error('❌ Error executing initialization SQL:', error);
  } finally {
    process.exit(0);
  }
}

initHospitals().catch(console.error);
