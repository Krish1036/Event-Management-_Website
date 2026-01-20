import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Verify admin role
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const eventId = params.eventId;

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title,event_date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get registration statistics
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('status')
      .eq('event_id', eventId);

    if (regError) {
      console.error('Error fetching registrations:', regError);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    const stats = {
      total: registrations?.length || 0,
      confirmed: registrations?.filter(r => r.status === 'CONFIRMED').length || 0,
      pending: registrations?.filter(r => r.status === 'PENDING').length || 0,
      cancelled: registrations?.filter(r => r.status === 'CANCELLED').length || 0,
    };

    return NextResponse.json({
      event,
      stats,
      total: stats.total,
      confirmed: stats.confirmed,
      pending: stats.pending,
      cancelled: stats.cancelled,
    });

  } catch (error) {
    console.error('Error fetching registration data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
