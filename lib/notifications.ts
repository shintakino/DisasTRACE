import { db } from "@/db";
import { notifications } from "@/db/schema";
import crypto from "crypto";

export type NotificationType =
  | "new_incident"
  | "incident_verified"
  | "ambulance_dispatched"
  | "responder_arrived"
  | "incident_resolved"
  | "registration_pending"
  | "registration_approved";

/**
 * Creates and stores an in-app notification in the database.
 * Supabase Realtime will automatically broadcast this insertion.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, any>
) {
  try {
    const id = crypto.randomUUID();
    const [newNotification] = await db.insert(notifications)
      .values({
        id,
        userId,
        type,
        title,
        body,
        unread: true,
        createdAt: new Date(),
        metadata,
      })
      .returning();
    
    console.log(`[Notification Engine] Created notification: ${id} for user ${userId}`);
    return newNotification;
  } catch (error) {
    console.error("[Notification Engine] Failed to create notification:", error);
    return null;
  }
}
