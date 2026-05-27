import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const PatchNotificationSchema = z.object({
  id: z.string().optional(),
  markAllAsRead: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const filter = unreadOnly 
      ? and(eq(notifications.userId, user.id), eq(notifications.unread, true))
      : eq(notifications.userId, user.id);

    const userNotifications = await db.query.notifications.findMany({
      where: filter,
      orderBy: [desc(notifications.createdAt)],
    });

    return NextResponse.json({
      notifications: userNotifications,
      unreadCount: userNotifications.filter(n => n.unread).length
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = PatchNotificationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { id, markAllAsRead } = result.data;

    if (markAllAsRead) {
      await db.update(notifications)
        .set({ unread: false })
        .where(eq(notifications.userId, user.id));
      
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing notification ID" }, { status: 400 });
    }

    const [updated] = await db.update(notifications)
      .set({ unread: false })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, notification: updated });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const result = await db.delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
        .returning();

      if (result.length === 0) {
        return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: "Notification deleted." });
    }

    // Clear all if no ID
    await db.delete(notifications)
      .where(eq(notifications.userId, user.id));

    return NextResponse.json({ success: true, message: "All notifications cleared." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
