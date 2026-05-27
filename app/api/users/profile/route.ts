import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const ProfileUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  address: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = ProfileUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { firstName, lastName, phone, position, address } = result.data;

    // 1. Fetch current db user details to compute values if missing
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 2. Build full name and address updates
    let updatedFullName = dbUser.fullName;
    if (firstName !== undefined || lastName !== undefined) {
      const currentMeta = user.user_metadata || {};
      const currentFirst = currentMeta.first_name || dbUser.fullName.split(" ")[0] || "";
      const currentLast = currentMeta.last_name || dbUser.fullName.split(" ").slice(1).join(" ") || "";
      
      const newFirst = firstName !== undefined ? firstName : currentFirst;
      const newLast = lastName !== undefined ? lastName : currentLast;
      updatedFullName = `${newFirst} ${newLast}`.trim();
    }

    const updatePayload: any = {
      fullName: updatedFullName,
      updatedAt: new Date(),
    };

    if (phone !== undefined) updatePayload.phone = phone;
    if (address !== undefined) updatePayload.address = address;
    // Map position to address column for administrative web profiles if address is omitted
    if (position !== undefined && address === undefined) {
      updatePayload.address = position;
    }

    // 3. Update public.users database record
    const [updatedUser] = await db.update(users)
      .set(updatePayload)
      .where(eq(users.id, user.id))
      .returning();

    // 4. Update Supabase Auth user metadata via service role adminClient to avoid JWT desync
    const adminClient = createAdminClient();
    const metaUpdates: any = {
      full_name: updatedFullName,
    };
    if (firstName !== undefined) metaUpdates.first_name = firstName;
    if (lastName !== undefined) metaUpdates.last_name = lastName;
    if (phone !== undefined) metaUpdates.phone = phone;
    if (position !== undefined) metaUpdates.position = position;
    if (address !== undefined) metaUpdates.address = address;

    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        ...metaUpdates,
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role,
      },
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
