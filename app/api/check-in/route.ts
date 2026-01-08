import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { checkIn } from '@/lib/edge-functions';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

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

  try {
    // Handle preview action
    if (body.action === 'preview') {
      const { text, eventId } = body;
      
      // Parse QR data to get registration_id
      let registration_id;
      console.log('[checkin] Raw QR text:', text);
      
      try {
        // Try to parse as signed token first
        const { verifyToken } = await import('@/lib/qr');
        const verification = verifyToken(text);
        console.log('[checkin] Token verification:', verification);
        
        if (verification.valid) {
          registration_id = verification.payload.registration_id;
          console.log('[checkin] Extracted registration_id from token:', registration_id);
        } else {
          // Try to parse as base64 JSON
          console.log('[checkin] Trying base64 JSON parse...');
          const parsed = JSON.parse(atob(text));
          registration_id = parsed.registration_id;
          console.log('[checkin] Extracted registration_id from base64:', registration_id);
        }
      } catch (err) {
        // Fallback: treat text as registration_id directly
        registration_id = text;
        console.log('[checkin] QR text fallback, using as registration_id:', registration_id);
        console.log('[checkin] Parse error:', err);
      }

      // Get registration with user and event details
      console.log('[checkin] Looking up registration with ID:', registration_id);
      const { data: registration, error: registrationError } = await supabase
        .from('registrations')
        .select(`
          *,
          user:profiles(id, full_name, email),
          event:events(id, title)
        `)
        .eq('id', registration_id)
        .single();

      console.log('[checkin] Registration lookup result:', { registration, registrationError });

      if (registrationError || !registration) {
        console.log('[checkin] Registration not found. Error:', registrationError);
        return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
      }

      // Check if event matches (if eventId provided)
      if (eventId && registration.event_id !== eventId) {
        return NextResponse.json({ success: false, error: 'Registration does not match this event' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        registrationId: registration.id,
        user: registration.user,
        event: registration.event,
        registrationStatus: registration.status
      });
    }

    // Handle confirm action
    if (body.action === 'confirm') {
      const { registrationId } = body;
      
      // Get registration to get entry_code
      const { data: registration, error: registrationError } = await supabase
        .from('registrations')
        .select('entry_code')
        .eq('id', registrationId)
        .single();

      if (registrationError || !registration) {
        return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });
      }

      const data = await checkIn({
        registration_id: registrationId,
        entry_code: registration.entry_code
      });
      return NextResponse.json({ ...data, success: true });
    }

    // Legacy check-in support
    const data = await checkIn({
      registration_id: body.registration_id,
      entry_code: body.entry_code
    });
    return NextResponse.json({ ...data, success: true });
  } catch (error: any) {
    console.error('check-in failed', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Check-in failed' },
      { status: 400 }
    );
  }
}
