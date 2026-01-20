-- Create event_emails table
CREATE TABLE IF NOT EXISTS event_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    sent_by TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'organizer')),
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_event_emails_event_id ON event_emails(event_id);
CREATE INDEX idx_event_emails_sent_by ON event_emails(sent_by);
CREATE INDEX idx_event_emails_sent_at ON event_emails(sent_at);

-- Enable RLS
ALTER TABLE event_emails ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Admins can view all email records
CREATE POLICY "Admins can view all event emails" ON event_emails
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Organizers can view emails for their own events
CREATE POLICY "Organizers can view their event emails" ON event_emails
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'organizer'
            AND EXISTS (
                SELECT 1 FROM events 
                WHERE events.id = event_emails.event_id 
                AND (events.created_by = auth.uid() OR events.assigned_organizer = auth.uid())
            )
        )
    );

-- Admins can insert email records
CREATE POLICY "Admins can insert event emails" ON event_emails
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Organizers can insert email records only for events they own/are assigned to
CREATE POLICY "Organizers can insert their event emails" ON event_emails
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'organizer'
        )
        AND EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_emails.event_id
            AND (events.created_by = auth.uid() OR events.assigned_organizer = auth.uid())
        )
    );

-- Updates/deletes are not allowed from client context
CREATE POLICY "No one can update event emails" ON event_emails
    FOR UPDATE USING (false);

CREATE POLICY "No one can delete event emails" ON event_emails
    FOR DELETE USING (false);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_emails_updated_at 
    BEFORE UPDATE ON event_emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
