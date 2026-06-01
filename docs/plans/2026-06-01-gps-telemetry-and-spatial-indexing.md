# GPS Telemetry & PostGIS Spatial Indexing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize active GPS tracking performance by routing high-frequency driving telemetry over lightweight Supabase Realtime Broadcast channels (throttling database coordinate history writes to every 30 seconds) and implementing a PostGIS GiST spatial index on a trigger-synced geometry point column for high-speed standby ambulance selection.

**Architecture:**
1. **Hybrid Telemetry Pipeline**:
   - Re-engineer the mobile responder GPS broadcast loop to publish coordinates every 3 seconds to a Supabase Realtime Broadcast channel `telemetry:[incidentId]`.
   - Update the resident client to subscribe to this Broadcast channel for sub-second smooth vehicle marker animation overlays.
   - Throttle responder SQL updates to once every 30 seconds or when they cross a 50-meter delta threshold.
2. **PostGIS GiST Spatial Indexing**:
   - Create a database migration adding `location_geom` (PostGIS Geometry Point, SRID 4326) to the `users` table.
   - Implement a PL/pgSQL database trigger function `public.update_location_geom()` that automatically parses and maps `last_latitude`/`last_longitude` writes into the geometry point.
   - Define a high-performance **GiST index** on `location_geom`.
   - Update the nearest-responder matching search queries (used in auto-dispatch engines) to utilize `ST_DWithin` and index scans.

**Tech Stack:** Next.js, React Native (Expo), PostGIS, Drizzle ORM, Supabase Realtime, PL/pgSQL.

---

### Task 1: PostGIS Database Migration (GiST Indexing & Triggers)

**Files:**
- Create: `drizzle/0005_add_gist_spatial_indexing.sql`
- Modify: `db/schema/users.ts:20-25`

**Step 1: Update Drizzle Schema**
Declare the new geometry column and index structure in `db/schema/users.ts`.
```typescript
import { pgTable, text, varchar, timestamp, doublePrecision, index, customType } from 'drizzle-orm/pg-core';

// Custom PostGIS Geometry Point Type definition for Drizzle
const geometryPoint = customType<{ data: string }>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
});

export const users = pgTable('users', {
  // ... existing fields
  lastLatitude: doublePrecision('last_latitude'),
  lastLongitude: doublePrecision('last_longitude'),
  locationGeom: geometryPoint('location_geom'),
}, (table) => ({
  locationGeomGistIdx: index('users_location_geom_gist_idx').using('gist', table.locationGeom),
}));
```

**Step 2: Create SQL Migration Script**
Write `drizzle/0005_add_gist_spatial_indexing.sql` to apply the spatial columns, setup the automated trigger, and index the points:
```sql
-- 1. Enable PostGIS extension (in case not active)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add Geometry Point column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location_geom" geometry(Point, 4326);

-- 3. Create GiST index on geometry column
CREATE INDEX IF NOT EXISTS "users_location_geom_gist_idx" ON "users" USING gist ("location_geom");

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
```

**Step 3: Run Database Migration**
Apply migration using `npx drizzle-kit push` or running raw SQL inside Supabase console.

**Step 4: Commit**
```bash
git add db/schema/users.ts drizzle/0005_add_gist_spatial_indexing.sql
git commit -m "db: implement PostGIS geometry column, automatic trigger, and GiST index"
```

---

### Task 2: High-Speed PostGIS Dispatch Search Query

**Files:**
- Modify: `lib/dispatch-engine.ts:35-80`

**Step 1: Optimize Nearest Responder Search**
Refactor the dispatcher ambulance lookup script in `lib/dispatch-engine.ts` to utilize geometry index scans:
```typescript
// Replace standard math formulas with ST_DWithin and ST_Distance to query nearest standby responders
const availableResponders = await db
  .select({
    id: users.id,
    fullName: users.fullName,
    // Calculate distance efficiently in meters using PostGIS geography casts
    distanceMeters: sql<number>`ST_Distance(
      ${users.locationGeom}::geography,
      ST_SetSRID(ST_MakePoint(${residentLng}, ${residentLat}), 4326)::geography
    )`
  })
  .from(users)
  .where(
    and(
      eq(users.role, "ambulance_responder"),
      eq(users.dutyStatus, "ON_DUTY"),
      sql`ST_DWithin(
        ${users.locationGeom}::geography,
        ST_SetSRID(ST_MakePoint(${residentLng}, ${residentLat}), 4326)::geography,
        15000 -- 15 km search radius limit
      )`
    )
  )
  .orderBy(sql`ST_Distance(${users.locationGeom}, ST_SetSRID(ST_MakePoint(${residentLng}, ${residentLat}), 4326))`)
  .limit(3);
```

**Step 2: Commit**
```bash
git add lib/dispatch-engine.ts
git commit -m "feat: optimize ambulance matching using PostGIS spatial indexing"
```

---

### Task 3: Throttled Mobile Broadcast & Live Realtime Telemetry

**Files:**
- Modify: `mobile/components/responder/ResponderHome.tsx` (Throttled DB logging)
- Modify: `mobile/hooks/use-broadcast-tracker.ts` (Switch to Realtime Broadcast)
- Modify: `mobile/app/help/tracking.tsx` (Resident client real-time listener)

**Step 1: Re-engineer Broadcast Tracker to Supabase Realtime**
Instead of hitting the DB every 3 seconds, update the responder tracking hook `use-broadcast-tracker.ts` to broadcast coordinates directly over an active Supabase Broadcast channel:
```typescript
const channel = supabase.channel(`telemetry:${incidentId}`);
// Every 3 seconds:
channel.send({
  type: 'broadcast',
  event: 'location',
  payload: { latitude, longitude, heading, speed }
});
```

**Step 2: Implement Throttled Database Logs**
Add a throttled scheduler that updates the database `users` coordinates (`last_latitude`, `last_longitude`) only once every 30 seconds or when the responder has driven more than 50 meters from their last recorded position:
```typescript
// Throttled database update checks
const distanceTraveled = calculateDistance(lastDbLat, lastDbLng, lat, lng);
if (elapsedTime >= 30 || distanceTraveled >= 50) {
  await fetch(`/api/users/location`, {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude })
  });
}
```

**Step 3: Update Resident Realtime Map overlays**
Re-engineer the active marker on `mobile/app/help/tracking.tsx` to subscribe to the Supabase Broadcast channel:
```typescript
const channel = supabase.channel(`telemetry:${incidentId}`);
channel
  .on('broadcast', { event: 'location' }, ({ payload }) => {
    // Smoothed transition animation using React Native animated map markers
    setAmbulanceLocation({ latitude: payload.latitude, longitude: payload.longitude });
  })
  .subscribe();
```

**Step 4: Commit**
```bash
git add mobile/
git commit -m "feat: route active GPS telemetry over Supabase Broadcast and throttle DB updates"
```
