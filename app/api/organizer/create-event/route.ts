import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'organizer') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const eventInput = body?.event;
    const formFields = (body?.form_fields ?? []) as any[];

    if (!eventInput) {
      return NextResponse.json({ success: false, error: 'Missing event payload' }, { status: 400 });
    }

    if (!eventInput.title || !eventInput.event_date || !eventInput.start_time || !eventInput.end_time) {
      return NextResponse.json({ success: false, error: 'Missing required event fields' }, { status: 400 });
    }

    const start = new Date(`2000-01-01T${eventInput.start_time}`);
    const end = new Date(`2000-01-01T${eventInput.end_time}`);
    if (
      !(start instanceof Date) ||
      !(end instanceof Date) ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime()) ||
      end <= start
    ) {
      return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 });
    }

    const capacity = Number(eventInput.capacity ?? 0);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return NextResponse.json({ success: false, error: 'Capacity must be greater than 0' }, { status: 400 });
    }

    const eventType: 'free' | 'paid' = eventInput.event_type === 'paid' ? 'paid' : 'free';
    let price = Number(eventInput.price ?? 0);
    if (eventType === 'paid') {
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { success: false, error: 'Price must be greater than 0 for paid events' },
          { status: 400 }
        );
      }
    } else {
      price = 0;
    }

    const saveMode = eventInput.save_mode === 'submit_for_approval' ? 'submit_for_approval' : 'draft';
    const status = saveMode === 'submit_for_approval' ? 'pending_approval' : 'draft';

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: eventInput.title,
        description: eventInput.description,
        location: eventInput.location,
        event_date: eventInput.event_date,
        start_time: eventInput.start_time,
        end_time: eventInput.end_time,
        capacity,
        is_registration_open: false,
        price,
        status,
        created_by: user.id,
        assigned_organizer: user.id
      })
      .select()
      .single();

    if (eventError || !event) {
      console.error('Failed to insert event', eventError);
      return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
    }

    if (Array.isArray(formFields) && formFields.length > 0) {
      const insertPayload = formFields.map((field) => ({
        event_id: event.id,
        label: field.label,
        field_type: field.field_type,
        required: !!field.required,
        options: field.options ?? null,
        disabled: false,
        original_required: typeof field.original_required === 'boolean' ? field.original_required : !!field.required,
        created_at: new Date().toISOString()
      }));

      const { error: fieldsError } = await supabase.from('event_form_fields').insert(insertPayload);

      if (fieldsError) {
        console.error('Failed to insert form fields', fieldsError);
        return NextResponse.json({ success: false, error: 'Failed to create form fields' }, { status: 500 });
      }
    }

    await supabase.from('organizer_logs').insert({
      organizer_id: user.id,
      action: saveMode === 'submit_for_approval' ? 'SUBMIT_FOR_APPROVAL' : 'CREATE_EVENT',
      details: {
        event_id: event.id,
        status
      }
    });

    return NextResponse.json({ success: true, event }, { status: 200 });
  } catch (error: any) {
    console.error('organizer create-event API error', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
