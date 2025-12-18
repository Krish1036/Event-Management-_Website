-- Migration: Add admin control columns to event_form_fields table
-- Required for admin form control functionality

ALTER TABLE event_form_fields
ADD COLUMN disabled boolean DEFAULT false,
ADD COLUMN disabled_by uuid references profiles(id),
ADD COLUMN disabled_at timestamptz,
ADD COLUMN overridden_by uuid references profiles(id),
ADD COLUMN overridden_at timestamptz,
ADD COLUMN original_required boolean;
