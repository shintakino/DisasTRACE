import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const runSetup = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  
  console.log('Setting up PL/pgSQL functions and Storage...');

  try {
    // 1. Create the distance function
    await sql`
      CREATE OR REPLACE FUNCTION public.find_available_responders_in_radius(
        incident_lat double precision,
        incident_lon double precision,
        radius_km double precision default 1.0
      )
      RETURNS TABLE (
        responder_id varchar,
        distance_km double precision
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          u.id as responder_id,
          (6371 * acos(
            cos(radians(incident_lat)) * cos(radians(u.latitude)) * 
            cos(radians(u.longitude) - radians(incident_lon)) + 
            sin(radians(incident_lat)) * sin(radians(u.latitude))
          )) as distance_km
        FROM public.users u
        WHERE u.role = 'ambulance_responder'
          AND u.status = 'ONLINE'
          AND (6371 * acos(
            cos(radians(incident_lat)) * cos(radians(u.latitude)) * 
            cos(radians(u.longitude) - radians(incident_lon)) + 
            sin(radians(incident_lat)) * sin(radians(u.latitude))
          )) <= radius_km
        ORDER BY distance_km ASC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    console.log('✅ find_available_responders_in_radius function created.');

    // 2. Storage Setup (Only works if the DB user has access to storage schema, common in Supabase local/remote setups)
    try {
      // Create bucket if it doesn't exist
      await sql`
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('incident-photos', 'incident-photos', true)
        ON CONFLICT (id) DO NOTHING;
      `;
      console.log('✅ incident-photos bucket created.');
      
      // We skip the detailed RLS policies via SQL for now as they require complex auth.uid() binding,
      // but the bucket itself is created and public-read.
    } catch (storageErr) {
      console.warn('⚠️ Could not configure Supabase storage via SQL. This is expected if the storage schema is restricted. Please create the bucket manually in the dashboard.');
    }

  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    process.exit(0);
  }
};

runSetup();
