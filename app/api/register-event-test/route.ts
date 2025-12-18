import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabaseUser = getSupabaseServerClient();

  const {
    data: { user }
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const limit = rateLimit(request, user.id);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  const eventId = body?.event_id as string | undefined;
  if (!eventId) {
    return NextResponse.json({ success: false, error: 'Missing event_id' }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdminClient();

    const { data: registrationId, error } = await admin.rpc('register_for_event', {
      p_event_id: eventId,
      p_user_id: user.id
    });

    if (error || !registrationId) {
      throw new Error(error?.message || 'Unable to register');
    }

    const { error: confirmError } = await admin.rpc('confirm_registration', {
      p_registration_id: registrationId
    });

    if (confirmError) {
      throw new Error(confirmError.message);
    }

    return NextResponse.json({ success: true, free: true, registration_id: registrationId });
  } catch (error: any) {
    console.error('register-event-test failed', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
