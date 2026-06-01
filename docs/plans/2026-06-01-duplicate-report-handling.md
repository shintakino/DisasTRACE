# Duplicate Report Handling: "Merge as Duplicate" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a "Merge as Duplicate" utility in the PACC dashboard that allows dispatchers to merge multiple bystander reports of the same emergency into an active verified incident, preventing resource double-dispatch while keeping duplicate residents updated on the active rescue progress in real-time.

**Architecture:**
1. **Schema Extension**: Update `verification_requests` status field to support `'DUPLICATE'` and add a nullable `parent_request_id` column.
2. **Backend controller**: Build `/api/verification/[id]/merge` POST controller to transition status, update parent mapping, and broadcast changes via Supabase Realtime.
3. **PACC Triage Form**: Add a prominent "Merge as Duplicate" action button inside the web Triage details panel that opens a modal listing currently active verified emergency incidents.
4. **Resident Client Sync**: Update mobile resident holding (`pending.tsx`) and tracking (`tracking.tsx`) screens to detect when their report is merged, automatically forwarding them to track the parent ambulance in real-time.

**Tech Stack:** Next.js (App Router), React Native (Expo), Supabase Realtime, PostgreSQL, Drizzle ORM, Tailwind CSS.

---

### Task 1: Database Migration & Schema Update

**Files:**
- Modify: `db/schema/verification_requests.ts:8-19`
- Create: `drizzle/migrations/0002_add_duplicate_merge.sql`

**Step 1: Update Drizzle Schema**
Edit the status enum and add the self-referential `parentRequestId` column in `db/schema/verification_requests.ts`:
```typescript
export const verificationRequests = pgTable('verification_requests', {
  id: varchar('id', { length: 255 }).primaryKey(),
  requestId: varchar('request_id', { length: 20 }).notNull().unique(),
  residentId: varchar('resident_id', { length: 255 }).references(() => users.id).notNull(),
  status: text('status', { enum: ['PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE'] }).default('PENDING').notNull(),
  parentRequestId: varchar('parent_request_id', { length: 255 }).references((): any => verificationRequests.id),
  // ... rest of fields
});
```

**Step 2: Generate Migration SQL**
Create a new migration file `drizzle/migrations/0002_add_duplicate_merge.sql`:
```sql
ALTER TABLE "verification_requests" ADD COLUMN "parent_request_id" varchar(255) REFERENCES "verification_requests"("id");
-- In PostgreSQL, we alter check constraints or recreate the domain if status has an enum constraint
```

**Step 3: Run Database Migration**
Run `npx drizzle-kit push` or execute raw SQL migration in Supabase to apply columns.

**Step 4: Commit**
```bash
git add db/schema/verification_requests.ts
git commit -m "db: add parent_request_id and duplicate status to verification requests"
```

---

### Task 2: Backend Merge API Endpoint

**Files:**
- Create: `app/api/verification/[id]/merge/route.ts`

**Step 1: Implement Endpoint Logic**
The endpoint expects a payload `{ parentRequestId: string }`.
1. Verify current caller is PACC Admin or CDRRMO Super Admin.
2. Update the target duplicate request status to `'DUPLICATE'` and populate `parent_request_id`.
3. Broadcast notifications via real-time triggers to the duplicate resident.
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { parentRequestId } = await req.json();

    if (!parentRequestId) {
      return NextResponse.json({ error: "Parent request ID is required" }, { status: 400 });
    }

    // Update duplicate report status and link to parent
    await db.update(verificationRequests)
      .set({ 
        status: "DUPLICATE",
        parentRequestId,
        updatedAt: new Date()
      })
      .where(eq(verificationRequests.id, id));

    return NextResponse.json({ success: true, message: "Incident merged successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: Commit**
```bash
git add app/api/verification/[id]/merge/route.ts
git commit -m "api: create verification report merge endpoint"
```

---

### Task 3: PACC Dashboard Triage UI

**Files:**
- Modify: `components/dashboard/verification-detail-sheet.tsx` or matching Triage Panel.
- Create: `components/dashboard/merge-duplicate-modal.tsx`

**Step 1: Create Merge Selector Modal**
Create a modal listing active verified incidents/requests to pick which incident this duplicate belongs to.
```typescript
// Fetch GET /api/verification?status=VERIFIED to let dispatchers search/select active parent requests.
```

**Step 2: Add Action Button**
In the Triage detailed sheet next to "Accept" and "Reject", add a yellow/amber **"Merge Duplicate"** button using a `GitMerge` or `Split` icon.

**Step 3: Commit**
```bash
git add components/dashboard/
git commit -m "ui: add merge duplicate button and selector modal to PACC dashboard"
```

---

### Task 4: Resident Mobile Synchronization

**Files:**
- Modify: `mobile/app/help/pending.tsx`
- Modify: `mobile/app/help/tracking.tsx`

**Step 1: Handle Merged Redirects**
Update real-time status subscription loops inside both pending holding radar and active trackers:
1. Capture status update `DUPLICATE`.
2. Fetch the assigned parent request telemetry and responder incident link.
3. Automatically update `useEmergencyReportStore` with the parent incident ID, coordinates, and responder metadata.
4. Render a gorgeous popup alert: `"Incident Merged: Responders are already heading to your location!"`
5. Transition the map routes to focus on the parent dispatched ambulance unit, synchronizing their telemetry.

**Step 2: Commit**
```bash
git add mobile/app/help/
git commit -m "mobile: sync resident client to parent emergency telemetry on duplicate merge"
```
