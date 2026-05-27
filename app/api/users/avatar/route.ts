import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate size (< 3MB) and type
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 3MB limit" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const fileExtension = file.name.split(".").pop() || "png";
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExtension}`;

    // Upload to Supabase avatars bucket using the user's client
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Update public.users database table (we'll save it to a new metadata field or address / address positions if no column, but wait, let's also update the Auth user metadata)
    const adminClient = createAdminClient();
    const currentMeta = user.user_metadata || {};
    
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMeta,
        avatar_url: publicUrl,
      }
    });

    // We can optionally store it in the public.users database by updating the updated_at timestamp or keeping it perfectly synchronized in Supabase auth metadata.
    await db.update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
      message: "Avatar uploaded successfully.",
    });
  } catch (error) {
    console.error("Error in avatar upload endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
