-- ============================================================================
-- GIFTTY v2 — MIGRATION 001: Core identity, roles, addresses, categories
-- Design principles applied from v1 post-mortem:
--   1. ONE auth system only — Supabase Auth. No parallel custom session table.
--   2. Every table gets RLS enabled + a policy in the SAME migration it's created in.
--   3. Money is always integer paise (bigint), never decimal/float.
--   4. Every user-owned table has an explicit user_id column checked by RLS
--      AND is expected to be re-checked in application code (defense in depth).
-- ============================================================================

-- ---------- ROLES ----------
create type public.app_role as enum ('customer', 'super_admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- SECURITY DEFINER function so RLS policies elsewhere can check role
-- without recursively hitting RLS on user_roles itself.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create policy "users can see their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "only super_admin can modify roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------- PROFILES ----------
-- One row per auth.users row, created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  birthday date,
  birthday_reminder_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "super_admin can view all profiles"
  on public.profiles for select using (public.has_role(auth.uid(), 'super_admin'));

-- Auto-create profile + default customer role on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer');

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ADDRESSES ----------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  landmark text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "users manage own addresses"
  on public.addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index addresses_user_id_idx on public.addresses(user_id);

-- ---------- CATEGORIES (unlimited, with subcategories via parent_id) ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  banner_url text,
  icon_url text,
  display_order integer not null default 0,
  is_festival boolean not null default false,
  festival_start_date date,
  festival_end_date date,
  is_recipient_category boolean not null default false,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "anyone can view active categories"
  on public.categories for select
  using (status = 'active' or public.has_role(auth.uid(), 'super_admin'));

create policy "only super_admin can manage categories"
  on public.categories for insert with check (public.has_role(auth.uid(), 'super_admin'));
create policy "only super_admin can update categories"
  on public.categories for update using (public.has_role(auth.uid(), 'super_admin'));
create policy "only super_admin can delete categories"
  on public.categories for delete using (public.has_role(auth.uid(), 'super_admin'));

create index categories_parent_idx on public.categories(parent_id);
create index categories_festival_dates_idx on public.categories(festival_start_date, festival_end_date) where is_festival;
