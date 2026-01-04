import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an organizer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'organizer') {
      return NextResponse.json({ error: 'Forbidden - Organizer access required' }, { status: 403 });
    }

    const eventId = params.eventId;

    // First, get the event to verify ownership and check status
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id, title, status, created_by, assigned_organizer')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify organizer owns this event (created_by or assigned_organizer)
    const isOwner = event.created_by === user.id || event.assigned_organizer === user.id;
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden - You can only delete your own events' }, { status: 403 });
    }

    // Check if event can be deleted (only draft or pending_approval)
    if (event.status !== 'draft' && event.status !== 'pending_approval') {
      return NextResponse.json({ 
        error: 'Forbidden - Only draft or pending approval events can be deleted' 
      }, { status: 403 });
    }

    // Delete the event
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    // Log the action in organizer_logs
    const { error: logError } = await supabase
      .from('organizer_logs')
      .insert({
        organizer_id: user.id,
        action: 'DELETE_EVENT',
        details: {
          event_id: eventId,
          event_title: event.title,
          event_status: event.status,
          deleted_at: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Error logging delete action:', logError);
      // Don't fail the request if logging fails, but log it
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });

  } catch (error) {
    console.error('Unexpected error in delete event API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
