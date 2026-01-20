import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

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
    const pricingOptions = (body?.pricing_options ?? []) as any[];

    if (!eventInput) {
      return NextResponse.json({ success: false, error: 'Missing event payload' }, { status: 400 });
    }

    if (!eventInput.title || !eventInput.event_date || !eventInput.start_time || !eventInput.end_time || !eventInput.image_url) {
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

    // Validate pricing type and options
    const pricingType = eventInput.pricing_type || (eventInput.price > 0 ? 'paid' : 'free');
    let price = Number(eventInput.price ?? 0);

    if (pricingType === 'paid') {
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { success: false, error: 'Price must be greater than 0 for paid events' },
          { status: 400 }
        );
      }
      // Minimum price for paid events is ₹1
      if (price < 1) {
        return NextResponse.json(
          { success: false, error: 'Minimum price for paid events is ₹1' },
          { status: 400 }
        );
      }
    } else {
      price = 0;
    }

    if (pricingType === 'custom') {
      if (!eventInput.pricing_dropdown_label?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Dropdown label is required for custom pricing events' },
          { status: 400 }
        );
      }

      if (!Array.isArray(pricingOptions) || pricingOptions.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one pricing option is required for custom pricing events' },
          { status: 400 }
        );
      }

      // Validate each pricing option
      for (const option of pricingOptions) {
        if (!option.label?.trim()) {
          return NextResponse.json(
            { success: false, error: 'All pricing options must have a label' },
            { status: 400 }
          );
        }

        const optionPrice = Number(option.price);
        if (!Number.isFinite(optionPrice) || optionPrice <= 0) {
          return NextResponse.json(
            { success: false, error: 'All pricing options must have a price greater than 0' },
            { status: 400 }
          );
        }

        if (optionPrice < 1) {
          return NextResponse.json(
            { success: false, error: 'Minimum price for pricing options is ₹1' },
            { status: 400 }
          );
        }
      }

      // Check for duplicate option names
      const labels = pricingOptions.map(opt => opt.label?.trim().toLowerCase()).filter(Boolean);
      const uniqueLabels = new Set(labels);
      if (labels.length !== uniqueLabels.size) {
        return NextResponse.json(
          { success: false, error: 'Duplicate pricing option names are not allowed' },
          { status: 400 }
        );
      }
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
        image_url: eventInput.image_url,
        capacity,
        is_registration_open: false,
        price,
        pricing_type: pricingType,
        pricing_dropdown_label: pricingType === 'custom' ? eventInput.pricing_dropdown_label : null,
        status,
        visibility: eventInput.visibility ?? 'public',
        created_by: user.id,
        assigned_organizer: user.id
      })
      .select()
      .single();

    if (eventError || !event) {
      console.error('Failed to insert event', eventError);
      return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
    }

    // Insert pricing options for custom pricing events
    if (pricingType === 'custom' && Array.isArray(pricingOptions) && pricingOptions.length > 0) {
      const admin = getSupabaseAdminClient();
      const pricingOptionsPayload = pricingOptions.map((option) => ({
        event_id: event.id,
        label: option.label.trim(),
        price: Number(option.price)
      }));

      const { error: pricingOptionsError } = await admin
        .from('event_pricing_options')
        .insert(pricingOptionsPayload);

      if (pricingOptionsError) {
        console.error('Failed to insert pricing options', pricingOptionsError);
        // Clean up the event since pricing options failed
        await supabase.from('events').delete().eq('id', event.id);
        return NextResponse.json({ success: false, error: 'Failed to create pricing options' }, { status: 500 });
      }
    }

    if (Array.isArray(formFields) && formFields.length > 0) {
      const admin = getSupabaseAdminClient();
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

      const { error: fieldsError } = await admin.from('event_form_fields').insert(insertPayload);

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
        status,
        pricing_type: pricingType,
        ...(pricingType === 'custom' && {
          pricing_dropdown_label: eventInput.pricing_dropdown_label,
          pricing_options_count: pricingOptions.length
        }),
        ...(pricingType === 'paid' && {
          price: price
        })
      }
    });

    return NextResponse.json({ success: true, event }, { status: 200 });
  } catch (error: any) {
    console.error('organizer create-event API error', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
