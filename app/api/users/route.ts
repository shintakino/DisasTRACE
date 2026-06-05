import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { auditLogs } from "@/db/schema/audit_logs";
import { eq } from "drizzle-orm";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { z } from "zod";
import crypto from "crypto";

const UpdateUserSchema = z.object({
  id: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING"]).optional(),
  role: z.enum(["public_user", "ambulance_responder", "pacc_admin", "cdrrmo_super_admin"]).optional(),
  rejectionReason: z.string().optional(),
});

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
    if (user.app_metadata?.role !== 'cdrrmo_super_admin') {
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
    });

    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { fullName, email, password, role, phone, address } = result.data;
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
        role
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
      await db.update(users)
        .set({ status: 'ACTIVE', verificationStatus: 'APPROVED' })
        .where(eq(users.id, createdUser.id));
      createdUser.status = 'ACTIVE';
      createdUser.verificationStatus = 'APPROVED';
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
    if (user.app_metadata?.role !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const result = UpdateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { id, status, role, rejectionReason } = result.data;
    const adminClient = createAdminClient();

    // Perform database update
    const updatePayload: any = { updatedAt: new Date() };
    if (status) updatePayload.status = status;
    if (role) updatePayload.role = role;
    if (rejectionReason) updatePayload.rejectionReason = rejectionReason;

    const [updatedUser] = await db.update(users)
      .set(updatePayload)
      .where(eq(users.id, id))
      .returning();

    // Side effect: If role or status changes, sync to Supabase Auth metadata using adminClient
    if (role || status) {
      const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(id);
      if (targetUser) {
        await adminClient.auth.admin.updateUserById(id, {
          app_metadata: {
            ...targetUser.app_metadata,
            ...(role ? { role } : {}),
            ...(status ? { status } : {}),
          }
        });
      }
    }

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Updated user: ${updatedUser?.fullName || id} (Role: ${role || 'unchanged'}, Status: ${status || 'unchanged'})`,
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

    if (user.app_metadata?.role !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing user ID parameter" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Delete user profile in local db
    await db.delete(users).where(eq(users.id, id));

    // Delete user in Supabase auth via adminClient
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

