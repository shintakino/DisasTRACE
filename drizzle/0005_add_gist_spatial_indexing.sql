-- 1. Enable PostGIS extension (in case not active)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add Geometry Point column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location_geom" geometry(Point, 4326);

-- 3. Create GiST index on geometry column
CREATE INDEX IF NOT EXISTS "users_location_geom_gist_idx" ON "users" USING gist ("location_geom");
CREATE INDEX IF NOT EXISTS "users_location_geom_geog_gist_idx" ON "users" USING gist ((location_geom::geography));

-- 4. Create trigger function to automatically synchronize lat/lng to geometry
CREATE OR REPLACE FUNCTION public.update_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_latitude IS NOT NULL AND NEW.last_longitude IS NOT NULL THEN
    NEW.location_geom := ST_SetSRID(ST_MakePoint(NEW.last_longitude, NEW.last_latitude), 4326);
  ELSE
    NEW.location_geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Bind trigger function to users table
DROP TRIGGER IF EXISTS trg_update_location_geom ON "users";
CREATE TRIGGER trg_update_location_geom
BEFORE INSERT OR UPDATE OF last_latitude, last_longitude
ON "users"
FOR EACH ROW
EXECUTE FUNCTION public.update_location_geom();
