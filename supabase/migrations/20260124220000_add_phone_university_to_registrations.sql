-- Migration: Store phone_number and university on registrations
-- These are system default user fields (like full_name/email) and must be stored per registration

ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS university text;

-- Keep register_for_event as the canonical place to insert registrations.
-- Populate phone_number/university from profiles at registration creation time.
CREATE OR REPLACE FUNCTION register_for_event(
  p_event_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity int;
  v_count int;
  v_registration_id uuid;
  v_phone text;
  v_university text;
BEGIN
  SELECT capacity
  INTO v_capacity
  FROM events
  WHERE id = p_event_id
    AND is_registration_open = true
    AND status = 'approved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration closed or event not approved';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM registrations
  WHERE event_id = p_event_id
    AND status IN ('PENDING','CONFIRMED');

  IF v_count >= v_capacity THEN
    RAISE EXCEPTION 'Event capacity full';
  END IF;

  SELECT p.phone_number, p.university
  INTO v_phone, v_university
  FROM profiles p
  WHERE p.id = p_user_id;

  INSERT INTO registrations (event_id, user_id, status, phone_number, university)
  VALUES (p_event_id, p_user_id, 'PENDING', v_phone, v_university)
  RETURNING id INTO v_registration_id;

  RETURN v_registration_id;
END;
$$;
