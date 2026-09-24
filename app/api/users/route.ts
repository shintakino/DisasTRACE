import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { auditLogs } from "@/db/schema/audit_logs";
import { statusLogs } from "@/db/schema/status_logs";
import { notifications } from "@/db/schema/notifications";
import { feedbacks } from "@/db/schema/feedbacks";
import { reports } from "@/db/schema/reports";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { and, eq, inArray, or } from "drizzle-orm";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { getUserRole } from "@/lib/auth";
import { z } from "zod";
import crypto from "crypto";
import { isValidPhilippinePhone, normalizePhilippinePhone } from "@/lib/phone";
import { isValidAmbulanceUnitId, normalizeAmbulanceUnitId } from "@/lib/ambulance-unit";

const UpdateUserSchema = z.object({
  id: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING"]).optional(),
  role: z.enum(["public_user", "ambulance_responder", "pacc_admin", "cdrrmo_super_admin"]).optional(),
  rejectionReason: z.string().optional(),
  fullName: z.string().trim().min(2).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().trim().max(500).optional(),
  unitId: z.string().trim().max(50).optional(),
});

function isUnitIdConflict(error: unknown): boolean {
  const inspected = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === 'object' && !inspected.has(current)) {
    inspected.add(current);
    const databaseError = current as { code?: unknown; constraint?: unknown; message?: unknown; cause?: unknown };
    if (
      databaseError.code === '23505'
      && (
        databaseError.constraint === 'users_unit_id_unique'
        || (typeof databaseError.message === 'string' && databaseError.message.includes('users_unit_id_unique'))
      )
    ) {
      return true;
    }
    current = databaseError.cause;
  }

  return false;
}

async function removeFailedResponderAccount(adminClient: ReturnType<typeof createAdminClient>, userId: string) {
  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch (cleanupError) {
    console.error('Failed to remove duplicate responder profile after Unit ID conflict:', cleanupError);
  }

  try {
    await adminClient.auth.admin.deleteUser(userId);
  } catch (cleanupError) {
    console.error('Failed to remove duplicate responder auth account after Unit ID conflict:', cleanupError);
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query real users from database
    const dbUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    const mappedUsers = dbUsers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : "Unknown",
      lastActive: u.updatedAt ? "Active recently" : "Never",
      phone: u.phone,
      address: u.address,
      unitId: u.unitId,
    }));

    return NextResponse.json({
      users: mappedUsers,
      summary: {
        total: mappedUsers.length,
        active: mappedUsers.filter((u) => u.status === "ACTIVE").length,
        suspended: mappedUsers.filter((u) => u.status === "SUSPENDED").length,
        deactivated: mappedUsers.filter((u) => u.status === "DEACTIVATED").length,
      },
    });
  } catch (error) {
    console.error("Error fetching users from database:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role gate: Only Super Admins can create administrative/responder accounts
    const currentUserRole = await getUserRole();
    if (currentUserRole !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const CreateUserSchema = z.object({
      fullName: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["public_user", "ambulance_responder", "pacc_admin", "cdrrmo_super_admin"]),
      phone: z.string().optional(),
      address: z.string().optional(),
      responderType: z.enum(["barangay", "cdrrmo_hq"]).optional(),
      barangay: z.string().optional(),
      unitId: z.string().trim().max(50).optional(),
    });

    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { fullName, email, password, role, phone, address, responderType, barangay, unitId: requestedUnitId } = result.data;
    const unitId = role === 'ambulance_responder' ? normalizeAmbulanceUnitId(requestedUnitId) : null;
    if (role === 'ambulance_responder' && (!unitId || !isValidAmbulanceUnitId(unitId))) {
      return NextResponse.json({ error: "Enter a valid unique Unit ID such as AMB-EG-7EC." }, { status: 400 });
    }
    if (unitId) {
      const existingUnit = await db.query.users.findFirst({ where: eq(users.unitId, unitId), columns: { id: true } });
      if (existingUnit) return NextResponse.json({ error: "That Unit ID is already assigned to another responder." }, { status: 409 });
    }
    const adminClient = createAdminClient();

    // Create the user in Supabase Auth via the service-role client
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone_confirm: true,
      phone,
      user_metadata: {
        full_name: fullName,
        phone,
        address,
        role,
        responder_type: responderType,
        barangay,
        unit_id: unitId,
      }
    });

    if (createError || !createData.user) {
      console.error("Supabase Admin Create User Error:", createError);
      return NextResponse.json({ error: createError?.message || "Failed to create user account" }, { status: 500 });
    }

    // Query the database to find the newly created user (inserted via postgres trigger handle_new_user_profile)
    const createdUser = await db.query.users.findFirst({
      where: eq(users.id, createData.user.id),
    });

    // Make sure we explicitly activate the user status and verification status if created by admin
    if (createdUser && (role === 'pacc_admin' || role === 'cdrrmo_super_admin')) {
      await db.update(users)
        .set({ status: 'ACTIVE', verificationStatus: 'APPROVED' })
        .where(eq(users.id, createdUser.id));
      createdUser.status = 'ACTIVE';
      createdUser.verificationStatus = 'APPROVED';
    } else if (createdUser && role === 'ambulance_responder') {
      // Direct approve responders created by admin
      try {
        await db.update(users)
          .set({
            status: 'ACTIVE',
            verificationStatus: 'APPROVED',
            responderType: responderType || null,
            barangay: responderType === 'barangay' ? barangay || null : null,
            unitId,
          })
          .where(eq(users.id, createdUser.id));
      } catch (error) {
        if (isUnitIdConflict(error)) {
          await removeFailedResponderAccount(adminClient, createdUser.id);
          return NextResponse.json({ error: "That Unit ID is already assigned to another responder." }, { status: 409 });
        }
        throw error;
      }
      createdUser.status = 'ACTIVE';
      createdUser.verificationStatus = 'APPROVED';
      createdUser.unitId = unitId;
    }

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Created account: ${email} (${role})`,
      entityType: "USER",
      entityId: createData.user.id,
    });

    return NextResponse.json({
      success: true,
      user: createdUser,
      message: "Account successfully created."
    });
  } catch (error) {
    console.error("Error creating user globally:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role gate: Only Super Admins can update roles and statuses globally
    const currentUserRole = await getUserRole();
    if (currentUserRole !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const result = UpdateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { id, status, role, rejectionReason, fullName, email, phone, address, unitId: requestedUnitId } = result.data;
    const adminClient = createAdminClient();

    const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existingUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if ((fullName !== undefined || email !== undefined || phone !== undefined || address !== undefined) && existingUser.role !== 'public_user') {
      return NextResponse.json({ error: "Only registered public-user profile information can be edited here." }, { status: 400 });
    }
    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const emailOwner = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
      if (emailOwner) return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    const normalizedPhone = phone === undefined ? undefined : normalizePhilippinePhone(phone);
    if (phone !== undefined && !isValidPhilippinePhone(phone)) {
      return NextResponse.json({ error: "Enter a valid Philippine mobile number." }, { status: 400 });
    }
    const targetRole = role ?? existingUser.role;
    const isPromotingToResponder = targetRole === 'ambulance_responder' && existingUser.role !== 'ambulance_responder';
    const isRemovingResponderRole = existingUser.role === 'ambulance_responder' && targetRole !== 'ambulance_responder';
    const normalizedUnitId = requestedUnitId === undefined ? undefined : normalizeAmbulanceUnitId(requestedUnitId);

    if (isPromotingToResponder && normalizedUnitId === undefined) {
      return NextResponse.json({ error: "A valid unique Unit ID is required before assigning the responder role." }, { status: 400 });
    }
    if (normalizedUnitId !== undefined && targetRole !== 'ambulance_responder') {
      return NextResponse.json({ error: "Unit IDs can only be assigned to ambulance responders." }, { status: 400 });
    }

    const unitIdWillChange = normalizedUnitId !== undefined || isRemovingResponderRole;
    const nextUnitId = isRemovingResponderRole ? null : normalizedUnitId;
    if (unitIdWillChange) {
      if (targetRole === 'ambulance_responder' && (!nextUnitId || !isValidAmbulanceUnitId(nextUnitId))) {
        return NextResponse.json({ error: "Enter a valid Unit ID such as AMB-EG-7EC." }, { status: 400 });
      }
      const activeIncident = await db.query.incidents.findFirst({
        where: and(
          or(eq(incidents.responderId, id), eq(incidents.currentOfferResponderId, id)),
          inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED']),
        ),
        columns: { id: true },
      });
      if (activeIncident) {
        return NextResponse.json({ error: "This responder has an active dispatch. Finish it before changing the Unit ID." }, { status: 409 });
      }
      if (nextUnitId) {
        const existingUnit = await db.query.users.findFirst({ where: eq(users.unitId, nextUnitId), columns: { id: true } });
        if (existingUnit && existingUnit.id !== id) {
          return NextResponse.json({ error: "That Unit ID is already assigned to another responder." }, { status: 409 });
        }
      }
    }

    // Perform database update
    const updatePayload: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (status) updatePayload.status = status;
    if (role) updatePayload.role = role;
    if (rejectionReason) updatePayload.rejectionReason = rejectionReason;
    if (fullName !== undefined) updatePayload.fullName = fullName;
    if (email !== undefined) updatePayload.email = email.toLowerCase();
    if (normalizedPhone !== undefined) updatePayload.phone = normalizedPhone;
    if (address !== undefined) updatePayload.address = address;
    if (unitIdWillChange) updatePayload.unitId = nextUnitId;

    let updatedUser: typeof users.$inferSelect | undefined;
    try {
      [updatedUser] = await db.update(users)
        .set(updatePayload)
        .where(eq(users.id, id))
        .returning();
    } catch (error) {
      if (isUnitIdConflict(error)) {
        return NextResponse.json({ error: "That Unit ID is already assigned to another responder." }, { status: 409 });
      }
      throw error;
    }

    // Side effect: If role or status changes, sync to Supabase Auth metadata using adminClient
    if (role || status || fullName !== undefined || email !== undefined || normalizedPhone !== undefined || address !== undefined || unitIdWillChange) {
      const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(id);
      if (targetUser) {
        await adminClient.auth.admin.updateUserById(id, {
          ...(email !== undefined ? { email: email.toLowerCase(), email_confirm: true } : {}),
          app_metadata: { ...targetUser.app_metadata, ...(role ? { role } : {}), ...(status ? { status } : {}) },
          user_metadata: {
            ...targetUser.user_metadata,
            ...(fullName !== undefined ? { full_name: fullName } : {}),
            ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(unitIdWillChange ? { unit_id: nextUnitId } : {}),
          },
        });
      }
    }

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Updated user: ${updatedUser?.fullName || id} (Role: ${role || 'unchanged'}, Status: ${status || 'unchanged'}${fullName !== undefined || email !== undefined || phone !== undefined || address !== undefined || unitIdWillChange ? ', Profile: updated' : ''})`,
      entityType: "USER",
      entityId: id,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "User status/role successfully synchronized."
    });
  } catch (error) {
    console.error("Error updating user globally:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserRole = await getUserRole();
    if (currentUserRole !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing user ID parameter" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Delete feedbacks
    await db.delete(feedbacks).where(eq(feedbacks.userId, id));

    // 2. Delete notifications
    await db.delete(notifications).where(eq(notifications.userId, id));

    // 3. Delete status logs
    await db.delete(statusLogs).where(eq(statusLogs.userId, id));

    // 4. Delete audit logs where the user is the performer (i.e. userId)

    // 5. Handle incidents and reports referencing this user as a responder
    await db.update(incidents)
      .set({ responderId: null })
      .where(eq(incidents.responderId, id));

    await db.update(incidents)
      .set({ currentOfferResponderId: null })
      .where(eq(incidents.currentOfferResponderId, id));

    await db.delete(reports).where(eq(reports.responderId, id));

    // 6. Handle verification requests, incidents, and reports if this user is a resident
    const residentRequests = await db.select({ id: verificationRequests.id })
      .from(verificationRequests)
      .where(eq(verificationRequests.residentId, id));

    if (residentRequests.length > 0) {
      const requestIds = residentRequests.map(r => r.id);

      const relatedIncidents = await db.select({ id: incidents.id })
        .from(incidents)
        .where(inArray(incidents.requestId, requestIds));

      if (relatedIncidents.length > 0) {
        const incidentIds = relatedIncidents.map(i => i.id);
        await db.delete(reports).where(inArray(reports.incidentId, incidentIds));
        await db.delete(incidents).where(inArray(incidents.id, incidentIds));
      }

      await db.delete(verificationRequests).where(eq(verificationRequests.residentId, id));
    }

    // 7. Delete user profile in local db
    await db.delete(users).where(eq(users.id, id));

    // 8. Delete user in Supabase auth via adminClient
    await adminClient.auth.admin.deleteUser(id);

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Deleted user account: ${id}`,
      entityType: "USER",
      entityId: id,
    });

    return NextResponse.json({
      success: true,
      message: "User successfully deleted from system auth."
    });
  } catch (error) {
    console.error("Error deleting user globally:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
