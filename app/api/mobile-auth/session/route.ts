import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getBearerToken, getMobileSessionState, MOBILE_SESSION_INVALID_CODE } from '@/lib/mobile-session';

export const runtime = 'nodejs';

/** Lets the installed app fail closed when a device was replaced or released. */
export async function GET(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const state = await getMobileSessionState(user.id, accessToken);
  if (!state.exists) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (state.mobile && !state.active) {
    return NextResponse.json({ code: MOBILE_SESSION_INVALID_CODE, error: 'This mobile session is no longer active.' }, { status: 401 });
  }

  return NextResponse.json({ active: true, mobile: state.mobile });
}
