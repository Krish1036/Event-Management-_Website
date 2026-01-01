-- Add organizer_logs table and extend events status for organizer approval workflow

-- 1) Extend events.status to support pending_approval
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft','pending_approval','approved','cancelled'));

-- 2) Organizer logs (immutable audit trail)
CREATE TABLE IF NOT EXISTS public.organizer_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizer_logs_organizer_id ON public.organizer_logs (organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_logs_created_at ON public.organizer_logs (created_at);

-- Enable RLS
ALTER TABLE public.organizer_logs ENABLE ROW LEVEL SECURITY;

-- Policies: organizer can read/insert their own logs; admin can manage all
DROP POLICY IF EXISTS "Organizer view own logs" ON public.organizer_logs;
CREATE POLICY "Organizer view own logs"
  ON public.organizer_logs FOR SELECT
  USING (organizer_id = auth.uid() OR is_admin_by_email());

DROP POLICY IF EXISTS "Organizer insert own logs" ON public.organizer_logs;
CREATE POLICY "Organizer insert own logs"
  ON public.organizer_logs FOR INSERT
  WITH CHECK (organizer_id = auth.uid() OR is_admin_by_email());

DROP POLICY IF EXISTS "Admin manage organizer logs" ON public.organizer_logs;
CREATE POLICY "Admin manage organizer logs"
  ON public.organizer_logs FOR ALL
  USING (is_admin_by_email());
