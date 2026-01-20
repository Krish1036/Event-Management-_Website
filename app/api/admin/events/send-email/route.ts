import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

import nodemailer from 'nodemailer';

interface RegistrationWithEmail {
  profiles: {
    email: any;
    full_name: any;
  };
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// Rate limiting: Max 3 sends per event per hour
const rateLimitStore = new Map<string, { count: number; lastSent: number }>();

function checkRateLimit(eventId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  const existing = rateLimitStore.get(eventId);
  
  if (!existing) {
    rateLimitStore.set(eventId, { count: 1, lastSent: now });
    return { allowed: true };
  }
  
  if (now - existing.lastSent > oneHour) {
    rateLimitStore.set(eventId, { count: 1, lastSent: now });
    return { allowed: true };
  }
  
  if (existing.count >= 3) {
    return { 
      allowed: false, 
      error: 'Rate limit exceeded. Maximum 3 emails per event per hour.' 
    };
  }
  
  existing.count++;
  existing.lastSent = now;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const transport = getSmtpTransport();
    if (!transport) {
      return NextResponse.json(
        {
          error:
            'Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment variables.',
        },
        { status: 503 }
      );
    }
    
    // Verify admin role
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role,full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { eventId, subject, body } = await request.json();

    if (!eventId || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(eventId);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.error }, { status: 429 });
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title,event_date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get confirmed registrations with user details
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select(`
        profiles!inner(email, full_name)
      `)
      .eq('event_id', eventId)
      .eq('status', 'CONFIRMED')
      .neq('profiles.email', null);

    if (regError) {
      console.error('Error fetching registrations:', regError);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ error: 'No confirmed participants found' }, { status: 404 });
    }

    if (registrations.length > 5000) {
      return NextResponse.json({ error: 'Too many recipients. Maximum 5000 recipients allowed.' }, { status: 400 });
    }

    // Process emails in batches of 150
    const batchSize = 150;
    const batches = [];
    for (let i = 0; i < registrations.length; i += batchSize) {
      batches.push(registrations.slice(i, i + batchSize));
    }

    let successCount = 0;
    let totalRecipients = registrations.length;

    for (const batch of batches) {
      try {
        const emailPromises = batch.map(async (registration) => {
          const profile = Array.isArray((registration as any).profiles)
            ? (registration as any).profiles[0]
            : (registration as any).profiles;

          const toEmail = profile?.email as string | undefined;
          const participantName = (profile?.full_name as string | undefined) || 'Participant';

          if (!toEmail) {
            return { error: new Error('Missing recipient email'), success: false };
          }

          const personalizedBody = body
            .replace(/\{\{event_name\}\}/g, event.title)
            .replace(/\{\{event_date\}\}/g, new Date(event.event_date).toLocaleDateString())
            .replace(/\{\{event_time\}\}/g, new Date(event.event_date).toLocaleTimeString())
            .replace(/\{\{participant_name\}\}/g, participantName);

          try {
            await transport.sendMail({
              from:
                process.env.FROM_EMAIL ||
                process.env.SMTP_FROM_EMAIL ||
                process.env.SMTP_USER ||
                'noreply@univevents.in',
              to: toEmail,
              subject,
              html: personalizedBody,
            });
            return { error: null, success: true };
          } catch (err) {
            return { error: err, success: false };
          }
        });

        const results = await Promise.allSettled(emailPromises);
        const batchSuccess = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
        successCount += batchSuccess;

        // Add delay between batches to avoid overwhelming email service
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (batchError) {
        console.error('Batch error:', batchError);
      }
    }

    // Record email in database
    const { error: insertError } = await supabase
      .from('event_emails')
      .insert({
        event_id: eventId,
        sent_by: profile.full_name || user.email,
        sender_role: 'admin',
        subject,
        body_html: body,
        recipient_count: successCount,
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error recording email:', insertError);
    }

    // Log action
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'SEND_EVENT_EMAIL',
        details: {
          event_id: eventId,
          subject,
          recipient_count: successCount,
          total_recipients: totalRecipients,
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      recipientCount: successCount,
      totalRecipients,
      message: `Email sent to ${successCount} of ${totalRecipients} confirmed participants`
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
