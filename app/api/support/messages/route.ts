import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supportMessages } from "@/db/schema";
import { createClient } from "@/lib/supabase-server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const MessageSubmissionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

const MessageUpdateSchema = z.object({
  id: z.string().min(1, "ID is required"),
  status: z.enum(["UNREAD", "READ", "RESOLVED"]),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Although the user is typically authenticated, we'll extract the userId if present
    const userId = user?.id || null;

    const body = await req.json();
    const validation = MessageSubmissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid payload", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { name, email, subject, message } = validation.data;

    const [newMessage] = await db.insert(supportMessages).values({
      id: crypto.randomUUID(),
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      status: "UNREAD",
    }).returning();

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Error creating support message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for admin role
    const role = user?.app_metadata?.role;
    if (role !== "pacc_admin" && role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await db.query.supportMessages.findMany({
      orderBy: [desc(supportMessages.createdAt)],
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching support messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for admin role
    const role = user?.app_metadata?.role;
    if (role !== "pacc_admin" && role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = MessageUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid payload", 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { id, status } = validation.data;

    const [updatedMessage] = await db.update(supportMessages)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(supportMessages.id, id))
      .returning();

    if (!updatedMessage) {
      return NextResponse.json({ error: "Support message not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedMessage });
  } catch (error) {
    console.error("Error updating support message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
