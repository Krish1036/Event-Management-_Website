-- ===============================
-- EXTENSIONS
-- ===============================
create extension if not exists "pgcrypto";

-- ===============================
-- PROFILES (User roles)
-- ===============================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text check (role in ('student','organizer','admin')) not null default 'student',
  created_at timestamptz default now()
);

-- ===============================
-- EVENTS
-- ===============================
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,

  event_date date not null,
  start_time time not null,
  end_time time not null,

  capacity integer not null check (capacity > 0),
  is_registration_open boolean default true,

  price numeric(10,2) default 0,
  is_paid boolean generated always as (price > 0) stored,

  created_by uuid references profiles(id),
  status text check (status in ('draft','approved','cancelled')) default 'draft',

  created_at timestamptz default now()
);

-- ===============================
-- EVENT FORM FIELDS
-- ===============================
create table event_form_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  label text not null,
  field_type text check (field_type in ('text','number','select','file')) not null,
  required boolean default false,
  options jsonb,
  created_at timestamptz default now()
);

-- ===============================
-- REGISTRATIONS
-- ===============================
create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,

  status text check (status in ('PENDING','CONFIRMED','CANCELLED')) not null,
  entry_code text unique,

  created_at timestamptz default now(),
  unique (event_id, user_id)
);

-- ===============================
-- REGISTRATION RESPONSES
-- ===============================
create table registration_responses (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references registrations(id) on delete cascade,
  field_id uuid references event_form_fields(id) on delete cascade,
  value text
);

-- ===============================
-- PAYMENTS
-- ===============================
create table payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references registrations(id) on delete cascade,

  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,

  amount numeric(10,2) not null,
  status text check (status in ('CREATED','SUCCESS','FAILED')) not null,

  created_at timestamptz default now()
);

-- ===============================
-- ATTENDANCE
-- ===============================
create table attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid unique references registrations(id) on delete cascade,
  checked_in_at timestamptz default now()
);

-- ===============================
-- ADMIN LOGS
-- ===============================
create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- ===============================
-- INDEXES
-- ===============================
create index idx_events_date on events(event_date);
create index idx_registrations_event on registrations(event_id);
create index idx_registrations_status on registrations(status);
create index idx_registrations_entry_code on registrations(entry_code);
create index idx_payments_status on payments(status);

-- ===============================
-- CAPACITY-SAFE REGISTRATION FUNCTION
-- ===============================
create or replace function register_for_event(
  p_event_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_capacity int;
  v_count int;
  v_registration_id uuid;
begin
  select capacity
  into v_capacity
  from events
  where id = p_event_id
    and is_registration_open = true
    and status = 'approved'
  for update;

  if not found then
    raise exception 'Registration closed or event not approved';
  end if;

  select count(*)
  into v_count
  from registrations
  where event_id = p_event_id
    and status in ('PENDING','CONFIRMED');

  if v_count >= v_capacity then
    raise exception 'Event capacity full';
  end if;

  insert into registrations (event_id, user_id, status)
  values (p_event_id, p_user_id, 'PENDING')
  returning id into v_registration_id;

  return v_registration_id;
end;
$$;

-- ===============================
-- CONFIRM REGISTRATION (GENERATE ENTRY CODE)
-- ===============================
create or replace function confirm_registration(
  p_registration_id uuid
)
returns void
language plpgsql
as $$
declare
  v_code text;
begin
  v_code := 'GAN-' || upper(substr(gen_random_uuid()::text, 1, 6));

  update registrations
  set status = 'CONFIRMED',
      entry_code = v_code
  where id = p_registration_id;
end;
$$;

-- ===============================
-- ROW LEVEL SECURITY
-- ===============================
alter table profiles enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table payments enable row level security;
alter table attendance enable row level security;
alter table admin_logs enable row level security;

-- ===============================
-- RLS POLICIES
-- ===============================

create policy "Users view own profile"
on profiles for select
using (id = auth.uid());

create policy "Public view approved events"
on events for select
using (status = 'approved');

create policy "Organizer & admin manage events"
on events for all
using (
  created_by = auth.uid()
  or exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);

create policy "User view own registrations"
on registrations for select
using (user_id = auth.uid());

create policy "Admin manage registrations"
on registrations for all
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);

create policy "Admin manage payments"
on payments for all
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);

create policy "Admin & organizer attendance"
on attendance for all
using (
  exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('admin','organizer')
  )
);

create policy "Admin logs only"
on admin_logs for all
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);
