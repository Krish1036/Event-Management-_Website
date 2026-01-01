import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

interface IncomingFormField {
  id?: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'file';
  required: boolean;
  options?: string[];
  disabled?: boolean;
  original_required?: boolean;
}

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

    const eventId = body?.eventId as string | undefined;
    const eventInput = body?.event;
    const formFields = (body?.form_fields ?? []) as IncomingFormField[];
    const intent = body?.intent as string | undefined;

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Missing event_id' }, { status: 400 });
    }

    if (!eventInput) {
      return NextResponse.json({ success: false, error: 'Missing event payload' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const { data: existingEvent, error: existingEventError } = await admin
      .from('events')
      .select(
        'id,title,description,location,event_date,start_time,end_time,capacity,is_registration_open,status,price,visibility,created_by,assigned_organizer'
      )
      .eq('id', eventId)
      .single();

    if (existingEventError || !existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const isOwned = existingEvent.created_by === user.id || existingEvent.assigned_organizer === user.id;
    if (!isOwned) {
      return NextResponse.json({ success: false, error: 'Not authorized for this event' }, { status: 403 });
    }

    // Normalize & validate required fields
    if (!eventInput.event_date || !eventInput.start_time || !eventInput.end_time) {
      return NextResponse.json({ success: false, error: 'Missing required date/time fields' }, { status: 400 });
    }

    const start = new Date(`2000-01-01T${eventInput.start_time}`);
    const end = new Date(`2000-01-01T${eventInput.end_time}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 });
    }

    const incomingCapacity = Number(eventInput.capacity ?? existingEvent.capacity ?? 0);
    if (!Number.isFinite(incomingCapacity) || incomingCapacity <= 0) {
      return NextResponse.json({ success: false, error: 'Capacity must be greater than 0' }, { status: 400 });
    }

    const incomingPrice = Number(eventInput.price ?? existingEvent.price ?? 0);
    if (!Number.isFinite(incomingPrice) || incomingPrice < 0) {
      return NextResponse.json({ success: false, error: 'Invalid price' }, { status: 400 });
    }

    // Capacity safeguard: confirmed registrations must not exceed capacity (no override for organizer)
    const { count: confirmedCount } = await admin
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'CONFIRMED');

    if ((confirmedCount ?? 0) > incomingCapacity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Capacity is lower than confirmed registrations',
          code: 'CAPACITY_BELOW_CONFIRMED',
          confirmed_registrations: confirmedCount ?? 0
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const existingStatus = existingEvent.status as 'approved' | 'draft' | 'pending_approval' | 'cancelled';

    // Determine allowed updates based on status
    const isApproved = existingStatus === 'approved';

    // Organizer cannot directly open/close registrations or cancel/publish
    const nextStatus: 'draft' | 'pending_approval' | 'approved' | 'cancelled' =
      !isApproved && intent === 'submit_for_approval' ? 'pending_approval' : isApproved ? 'approved' : 'draft';

    // Validate restrictions
    const forbiddenErrors: string[] = [];

    const attempt = {
      title: eventInput.title ?? existingEvent.title,
      description: eventInput.description ?? existingEvent.description,
      location: eventInput.location ?? existingEvent.location,
      event_date: eventInput.event_date ?? existingEvent.event_date,
      start_time: eventInput.start_time ?? existingEvent.start_time,
      end_time: eventInput.end_time ?? existingEvent.end_time,
      capacity: incomingCapacity,
      price: incomingPrice,
      visibility: eventInput.visibility ?? existingEvent.visibility ?? 'public'
    };

    if (isApproved) {
      const changingProtected =
        attempt.title !== existingEvent.title ||
        attempt.event_date !== existingEvent.event_date ||
        attempt.start_time !== existingEvent.start_time ||
        attempt.end_time !== existingEvent.end_time ||
        Number(attempt.capacity) !== Number(existingEvent.capacity) ||
        Number(attempt.price) !== Number(existingEvent.price) ||
        (attempt.visibility ?? 'public') !== (existingEvent.visibility ?? 'public');

      if (changingProtected) {
        forbiddenErrors.push('Approved events cannot change title, date/time, capacity, price, or visibility');
      }
    }

    if (forbiddenErrors.length > 0) {
      return NextResponse.json({ success: false, error: forbiddenErrors[0] }, { status: 400 });
    }

    // Update event payload based on allowed fields
    const updatedEventPayload: Record<string, any> = {
      description: attempt.description,
      location: attempt.location,
      status: nextStatus
    };

    if (!isApproved) {
      updatedEventPayload.title = attempt.title;
      updatedEventPayload.event_date = attempt.event_date;
      updatedEventPayload.start_time = attempt.start_time;
      updatedEventPayload.end_time = attempt.end_time;
      updatedEventPayload.capacity = attempt.capacity;
      updatedEventPayload.price = attempt.price;
      updatedEventPayload.visibility = attempt.visibility;
    }

    // Handle form fields (organizer cannot disable fields server-side)
    const { data: existingFields, error: existingFieldsError } = await admin
      .from('event_form_fields')
      .select('id,original_required,disabled')
      .eq('event_id', eventId);

    if (existingFieldsError) {
      return NextResponse.json({ success: false, error: 'Failed to load current form fields' }, { status: 500 });
    }

    const existingById = new Map<string, any>();
    for (const field of existingFields ?? []) {
      existingById.set(field.id as string, field);
    }

    const incomingById = new Map<string, IncomingFormField>();
    for (const field of formFields ?? []) {
      if (field.id) incomingById.set(field.id, field);
    }

    // Disable removed fields
    for (const [id, existing] of existingById.entries()) {
      const incoming = incomingById.get(id);
      if (!incoming) {
        if (!existing.disabled) {
          const { error } = await admin
            .from('event_form_fields')
            .update({ disabled: true, disabled_by: user.id, disabled_at: nowIso })
            .eq('id', id);
          if (error) {
            return NextResponse.json({ success: false, error: 'Failed to disable removed form fields' }, { status: 500 });
          }
        }
        continue;
      }

      const required = !!incoming.required;
      const originalRequired =
        typeof existing.original_required === 'boolean'
          ? existing.original_required
          : typeof incoming.original_required === 'boolean'
            ? incoming.original_required
            : required;

      const isOverridden = originalRequired !== required;

      const { error } = await admin
        .from('event_form_fields')
        .update({
          label: incoming.label,
          field_type: incoming.field_type,
          required,
          options: incoming.options ?? null,
          disabled: false,
          original_required: originalRequired,
          overridden_by: isOverridden ? user.id : null,
          overridden_at: isOverridden ? nowIso : null
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to update form fields' }, { status: 500 });
      }
    }

    // Insert new fields
    const newFieldsToInsert: any[] = [];
    for (const field of formFields ?? []) {
      if (field.id && existingById.has(field.id)) continue;
      const required = !!field.required;
      const originalRequired = typeof field.original_required === 'boolean' ? field.original_required : required;
      const isOverridden = originalRequired !== required;

      newFieldsToInsert.push({
        event_id: eventId,
        label: field.label,
        field_type: field.field_type,
        required,
        options: field.options ?? null,
        disabled: false,
        disabled_by: null,
        disabled_at: null,
        original_required: originalRequired,
        overridden_by: isOverridden ? user.id : null,
        overridden_at: isOverridden ? nowIso : null
      });
    }

    if (newFieldsToInsert.length > 0) {
      const { error } = await admin.from('event_form_fields').insert(newFieldsToInsert);
      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to insert new form fields' }, { status: 500 });
      }
    }

    const { data: updatedEvent, error: updateError } = await admin
      .from('events')
      .update(updatedEventPayload)
      .eq('id', eventId)
      .select()
      .single();

    if (updateError || !updatedEvent) {
      return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }

    await admin.from('organizer_logs').insert({
      organizer_id: user.id,
      action: intent === 'submit_for_approval' ? 'SUBMIT_FOR_APPROVAL' : 'UPDATE_EVENT',
      details: {
        event_id: eventId,
        status: nextStatus,
        timestamp: nowIso
      }
    });

    return NextResponse.json({ success: true, event: updatedEvent }, { status: 200 });
  } catch (error: any) {
    console.error('organizer update-event API error', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
