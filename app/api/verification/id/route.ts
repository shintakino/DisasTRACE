import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { createAdminClient, createClient } from '@/lib/supabase-server';

const MAX_ID_BYTES = 5 * 1024 * 1024;
// Preserve PostgreSQL microseconds; converting the version to a JS Date would lose precision.
const updatedAtVersion = sql<string>`cast(${users.updatedAt} as text)`;
const ALLOWED_ID_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const IdTypeSchema = z.enum([
  'National ID',
  'Passport',
  "Driver's License",
  'UMID',
  'Postal ID',
  'Other Valid ID',
]).optional();

/** Returns only whether the authenticated applicant still needs to submit ID. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });

    const profile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true, verificationStatus: true, idImageUrl: true },
    });
    if (!profile || (profile.role !== 'public_user' && profile.role !== 'ambulance_responder')) {
      return NextResponse.json({ error: 'Only mobile applicants can view verification requirements.' }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        hasDocument: Boolean(profile.idImageUrl),
        verificationStatus: profile.verificationStatus,
      },
    });
  } catch (error) {
    console.error('Government ID status lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load verification requirements.' }, { status: 500 });
  }
}

/**
 * Stores an authenticated applicant's identification document using the
 * server Storage client. Pending applicants cannot be expected to have a
 * permissive client-side Storage policy, so this route is the only mobile
 * write path for government ID evidence.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in is required to upload an ID document.' }, { status: 401 });
    }

    const profile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true, status: true, verificationStatus: true, idImageUrl: true },
      extras: { updatedAtVersion: updatedAtVersion.as('updated_at_version') },
    });
    if (!profile || (profile.role !== 'public_user' && profile.role !== 'ambulance_responder')) {
      return NextResponse.json({ error: 'Only mobile applicants can upload an ID document.' }, { status: 403 });
    }
    if (profile.verificationStatus === 'APPROVED') {
      return NextResponse.json({ error: 'Your approved ID cannot be replaced from the mobile app. Please contact CDRRMO for help.' }, { status: 409 });
    }
    if (profile.status !== 'PENDING') {
      return NextResponse.json({ error: 'This account cannot resubmit registration documents. Contact CDRRMO for assistance.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const idTypeField = formData.get('idType');
    const parsedIdType = IdTypeSchema.safeParse(typeof idTypeField === 'string' ? idTypeField : undefined);
    if (!parsedIdType.success) {
      return NextResponse.json({ error: 'Choose a valid government ID type.' }, { status: 400 });
    }
    const idType = parsedIdType.data ?? null;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A government ID image is required.' }, { status: 400 });
    }

    const extension = ALLOWED_ID_IMAGE_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: 'Government ID must be a JPEG, PNG, or WebP image.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_ID_BYTES) {
      return NextResponse.json({ error: 'Government ID image must be no larger than 5MB.' }, { status: 400 });
    }

    const filePath = `ids/${user.id}/${crypto.randomUUID()}.${extension}`;
    const storage = createAdminClient().storage.from('user-ids');
    const { error: uploadError } = await storage.upload(filePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error('Government ID storage upload failed:', uploadError);
      return NextResponse.json({ error: 'Unable to securely save the government ID image.' }, { status: 502 });
    }

    let saved;
    try {
    [saved] = await db.update(users)
      .set({
        idImageUrl: filePath,
        ...(idType ? { idType } : {}),
        verificationStatus: 'PENDING',
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.id, user.id), eq(users.status, 'PENDING'),
        eq(users.verificationStatus, profile.verificationStatus), eq(updatedAtVersion, profile.updatedAtVersion),
        profile.idImageUrl ? eq(users.idImageUrl, profile.idImageUrl) : isNull(users.idImageUrl),
      ))
      .returning({ id: users.id });
    } catch (error) {
      await storage.remove([filePath]).catch(() => undefined);
      throw error;
    }
    if (!saved) {
      await storage.remove([filePath]).catch(() => undefined);
      return NextResponse.json({ error: 'Your registration changed during upload. Refresh your status before trying again.' }, { status: 409 });
    }

    return NextResponse.json({ data: { filePath }, message: 'Government ID saved for CDRRMO review.' }, { status: 201 });
  } catch (error) {
    console.error('Government ID upload failed:', error);
    return NextResponse.json({ error: 'Unable to upload the government ID image.' }, { status: 500 });
  }
}
