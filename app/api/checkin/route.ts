import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as 'preview' | 'confirm' | undefined;

  const supabase = getSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });

  // check role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role ?? null;

  // helper to find registration by text (try entry_code then id)
  async function findRegistration(text: string) {
    // normalize text
    const t = (text ?? '').trim();
    if (!t) return null;

    // If the token looks signed (b64.sig) and we have a verifier, verify it first
    try {
      const { verifyToken } = await import('@/lib/qr');
      const verification = verifyToken(t);
      if (verification.valid && verification.payload && verification.payload.registration_id) {
        const rid = verification.payload.registration_id as string;
        const { data: regById } = await admin.from('registrations').select('id,status,entry_code,event_id,user_id,created_at').eq('id', rid).limit(1).single();
        if (regById) return regById;
      }
    } catch (e) {
      // verification failed or no secret configured — fall back to legacy methods
    }

    // try by entry_code first
    let { data: regs } = await admin.from('registrations').select('id,status,entry_code,event_id,user_id,created_at').eq('entry_code', t).limit(1).single();
    if (regs) return regs;

    // else try by id
    const { data: regById } = await admin.from('registrations').select('id,status,entry_code,event_id,user_id,created_at').eq('id', t).limit(1).single();
    if (regById) return regById;

    return null;
  }

  if (action === 'preview') {
    const text = body.text as string | undefined;
    const eventId = body.eventId as string | undefined;

    if (!text) return NextResponse.json({ message: 'Missing scan data' }, { status: 400 });

    const registration = await findRegistration(text);
    if (!registration) return NextResponse.json({ message: 'Registration not found for scanned code' }, { status: 404 });

    // restrict by event if provided
    if (eventId && registration.event_id !== eventId) return NextResponse.json({ message: 'Scanned registration does not belong to the selected event' }, { status: 400 });

    // ensure the current user (organizer) is allowed to checkin for that event
    if (role === 'organizer') {
      const { data: event } = await admin.from('events').select('id,created_by,assigned_organizer,title').eq('id', registration.event_id).single();
      const allowed = event && (event.created_by === user.id || event.assigned_organizer === user.id);
      if (!allowed) return NextResponse.json({ message: 'Not authorized for this registration' }, { status: 403 });
    }

    // fetch user profile
    const { data: userProfile } = await admin.from('profiles').select('id,full_name,email').eq('id', registration.user_id).single();

    // best-effort: if profile missing email, try fetching from auth.users
    if (!userProfile?.email) {
      try {
        const { data: authUser } = await admin.from('auth.users').select('email').eq('id', registration.user_id).single();
        if (authUser?.email) userProfile.email = authUser.email;
      } catch (e) {
        // ignore
      }
    }

    // check attendance existence
    const { data: existing } = await admin.from('attendance').select('id').eq('registration_id', registration.id).single();

    return NextResponse.json({
      registrationId: registration.id,
      registrationStatus: registration.status,
      entryCode: registration.entry_code,
      event: { id: registration.event_id },
      user: userProfile ?? null,
      alreadyCheckedIn: !!existing
    });
  }

  if (action === 'confirm') {
    const registrationId = body.registrationId as string | undefined;
    if (!registrationId) return NextResponse.json({ message: 'Missing registrationId' }, { status: 400 });

    // fetch registration
    const { data: registration } = await admin.from('registrations').select('id,status,entry_code,event_id,user_id').eq('id', registrationId).single();
    if (!registration) return NextResponse.json({ message: 'Registration not found' }, { status: 404 });

    if (registration.status !== 'CONFIRMED') return NextResponse.json({ message: 'Registration not confirmed' }, { status: 400 });

    // authorization
    if (role === 'organizer') {
      const { data: event } = await admin.from('events').select('id,created_by,assigned_organizer').eq('id', registration.event_id).single();
      const allowed = event && (event.created_by === user.id || event.assigned_organizer === user.id);
      if (!allowed) return NextResponse.json({ message: 'Not authorized for this registration' }, { status: 403 });
    }

    // check existing
    const { data: existing } = await admin.from('attendance').select('id').eq('registration_id', registration.id).single();
    if (existing) {
      return NextResponse.json({ message: 'Already checked in' }, { status: 409 });
    }

    // insert attendance
    await admin.from('attendance').insert({ registration_id: registration.id });

    // optionally add organizer log when performed by organizer
    if (role === 'organizer') {
      await admin.from('organizer_logs').insert({
        organizer_id: user.id,
        action: 'ATTENDANCE_CHECKIN',
        details: { registration_id: registration.id, event_id: registration.event_id, user_id: registration.user_id, method: 'qr' }
      });
    }

    // return confirmation with user/profile
    const { data: userProfile } = await admin.from('profiles').select('id,full_name,email').eq('id', registration.user_id).single();

    return NextResponse.json({ success: true, registrationId: registration.id, user: userProfile ?? null });
  }

  return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
}
