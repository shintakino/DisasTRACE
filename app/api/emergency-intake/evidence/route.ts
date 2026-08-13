import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase-server';

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

/**
 * Accepts an evidence image before a guest report exists. The service-role
 * client writes it to Storage so an unauthenticated guest never needs a Storage
 * RLS policy or a Supabase session.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'An evidence image is required.' }, { status: 400 });
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: 'Evidence must be a JPEG, PNG, or WebP image.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_EVIDENCE_BYTES) {
      return NextResponse.json({ error: 'Evidence image must be between 1 byte and 5MB.' }, { status: 400 });
    }

    const path = `guest-intake/${crypto.randomUUID()}.${extension}`;
    const storage = createAdminClient().storage.from('incident-photos');
    const { error: uploadError } = await storage.upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error('Guest evidence storage upload failed:', uploadError);
      return NextResponse.json({ error: 'Unable to save the evidence image.' }, { status: 502 });
    }

    const { data: { publicUrl } } = storage.getPublicUrl(path);
    return NextResponse.json({ success: true, imageUrl: publicUrl }, { status: 201 });
  } catch (error) {
    console.error('Guest evidence upload failed:', error);
    return NextResponse.json({ error: 'Unable to process the evidence image.' }, { status: 500 });
  }
}
