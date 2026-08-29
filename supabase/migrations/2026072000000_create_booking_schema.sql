-- Migration: Create complete booking system schema
-- Affected tables: tours (new), customers (new), bookings (new), payments (new), admins (new)
-- This migration establishes the foundation for Yaadie Xplorer's booking and payment system

-- ============================================================================
-- TABLE: tours
-- ============================================================================
-- Stores all available tours with pricing, descriptions, and logistics
create table tours (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text, -- e.g., 'catamaran', 'adventure', 'cultural', 'historical'
  duration_hours numeric, -- duration in hours
  price_per_person numeric not null, -- standard per-person price
  group_discount_percent numeric default 0, -- discount for groups (0-100)
  group_minimum_size integer default 1, -- minimum group size for discount
  max_capacity integer, -- maximum participants per tour
  flat_rate boolean default false, -- true for charter/private bookings
  flat_rate_amount numeric, -- flat rate for charters
  includes_transportation boolean default true,
  includes_meals boolean default false,
  tour_type text default 'standard', -- 'standard', 'charter', 'private'
  location text,
  meeting_point text,
  meeting_time text, -- e.g., "8:00 AM"
  includes_insurance boolean default false,
  age_restrictions text,
  physical_difficulty text, -- e.g., 'easy', 'moderate', 'challenging'
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- create index for faster tour queries
create index tours_active_idx on tours(is_active);
create index tours_category_idx on tours(category);

-- enable row level security
alter table tours enable row level security;

-- policy: anyone can view active tours (public catalog)
create policy "Anyone can view active tours"
  on tours for select
  to anon, authenticated
  using (is_active = true);

-- policy: authenticated users can view all tours (including inactive for their own bookings)
create policy "Authenticated can view all tours"
  on tours for select
  to authenticated
  using (true);

-- ============================================================================
-- TABLE: customers (extends auth.users with profile data)
-- ============================================================================
-- Stores customer profile information linked to Supabase auth users
create table customers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text, -- denormalized from auth.users for easier queries
  country text,
  state_province text,
  special_requirements text, -- dietary, accessibility, preferences
  preferred_language text default 'en',
  newsletter_subscribed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- enable row level security
alter table customers enable row level security;

-- policy: users can view their own profile
create policy "Users can view own profile"
  on customers for select
  to authenticated
  using (auth.uid() = id);

-- policy: users can update their own profile
create policy "Users can update own profile"
  on customers for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- policy: users can insert their own profile
create policy "Users can create own profile"
  on customers for insert
  to authenticated
  with check (auth.uid() = id);

-- trigger: auto-create customer profile on user signup
create or replace function public.handle_new_customer()
returns trigger as $$
begin
  insert into public.customers (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_customer();

-- ============================================================================
-- TABLE: bookings
-- ============================================================================
-- Stores all tour bookings with participant info, dates, and special requests
create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade not null,
  tour_id uuid references tours(id) on delete restrict not null,
  booking_date date not null, -- the date the customer books for
  number_of_participants integer not null check (number_of_participants > 0),
  special_requests text,
  pickup_location text,
  estimated_price numeric not null,
  status text default 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  booking_reference text unique, -- human-readable booking ref (e.g., YX-20260727-001)
  notes text, -- internal notes for admin
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- create indexes for faster queries
create index bookings_customer_id_idx on bookings(customer_id);
create index bookings_tour_id_idx on bookings(tour_id);
create index bookings_booking_date_idx on bookings(booking_date);
create index bookings_status_idx on bookings(status);

-- enable row level security
alter table bookings enable row level security;

-- policy: customers can view their own bookings
create policy "Customers can view own bookings"
  on bookings for select
  to authenticated
  using (auth.uid() = customer_id);

-- policy: customers can create bookings for themselves
create policy "Customers can create bookings"
  on bookings for insert
  to authenticated
  with check (auth.uid() = customer_id);

-- policy: customers can update their own bookings (before payment)
create policy "Customers can update own pending bookings"
  on bookings for update
  to authenticated
  using (auth.uid() = customer_id and status = 'pending')
  with check (auth.uid() = customer_id);

-- ============================================================================
-- TABLE: payments
-- ============================================================================
-- Tracks all payments and payment status for bookings
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  deposit_amount numeric, -- 30% deposit amount for Yaadie Xplorer
  balance_amount numeric, -- remaining balance after deposit
  payment_status text default 'pending', -- 'pending', 'deposit_paid', 'fully_paid', 'refunded'
  payment_method text, -- 'stripe', 'bank_transfer', 'cash', etc.
  stripe_payment_intent_id text unique, -- Stripe payment intent ID
  stripe_charge_id text unique, -- Stripe charge ID
  receipt_url text, -- URL to receipt/invoice
  currency text default 'USD',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- create indexes for faster queries
create index payments_booking_id_idx on payments(booking_id);
create index payments_customer_id_idx on payments(customer_id);
create index payments_status_idx on payments(payment_status);
create index payments_stripe_intent_idx on payments(stripe_payment_intent_id);

-- enable row level security
alter table payments enable row level security;

-- policy: customers can view their own payments
create policy "Customers can view own payments"
  on payments for select
  to authenticated
  using (auth.uid() = customer_id);

-- policy: system can insert payments (for webhook processing)
-- This will be used by edge functions handling payment webhooks
create policy "System can create payments"
  on payments for insert
  to authenticated
  with check (auth.uid() = customer_id);

-- policy: system can update payments (for webhook processing)
create policy "System can update payments"
  on payments for update
  to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

-- ============================================================================
-- TABLE: admins
-- ============================================================================
-- Admin access control (email-based gating for site owner operations)
create table admins (
  email text primary key,
  created_at timestamptz default now()
);

-- enable row level security
alter table admins enable row level security;

-- policy: authenticated users can read the admins table
-- (not a SELECT policy because we don't use row-level checks, just existence)
create policy "Authenticated can view admins"
  on admins for select
  to authenticated
  using (true);

-- seed the site owner as the initial admin
-- (Replace with the actual owner email: theyaadiexplorer@gmail.com)
insert into admins (email) values ('theyaadiexplorer@gmail.com')
on conflict (email) do nothing;

-- ============================================================================
-- Admin Policies (for tour management)
-- ============================================================================
-- Admins can insert tours
create policy "Admins can insert tours"
  on tours for insert
  to authenticated
  with check (auth.jwt() ->> 'email' in (select email from admins));

-- Admins can update tours
create policy "Admins can update tours"
  on tours for update
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins))
  with check (auth.jwt() ->> 'email' in (select email from admins));

-- Admins can delete tours
create policy "Admins can delete tours"
  on tours for delete
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins));

-- Admins can view all bookings
create policy "Admins can view all bookings"
  on bookings for select
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins));

-- Admins can update booking status
create policy "Admins can update booking status"
  on bookings for update
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins))
  with check (auth.jwt() ->> 'email' in (select email from admins));

-- Admins can delete bookings (for data cleanup)
create policy "Admins can delete bookings"
  on bookings for delete
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins));

-- Admins can view all payments
create policy "Admins can view all payments"
  on payments for select
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins));

-- Admins can update payment status
create policy "Admins can update payment status"
  on payments for update
  to authenticated
  using (auth.jwt() ->> 'email' in (select email from admins))
  with check (auth.jwt() ->> 'email' in (select email from admins));
