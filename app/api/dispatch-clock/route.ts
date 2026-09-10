import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

/** Supplies the API clock for the responder offer countdown. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const responder = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (responder?.role !== 'ambulance_responder') {
    return NextResponse.json({ error: 'Responder access required' }, { status: 403 });
  }

  return NextResponse.json({ now: new Date().toISOString() });
}
