-- ============================================================================
-- GIFTTY v2 — MIGRATION 005: Store Settings (singleton row, same pattern as ai_settings)
-- ============================================================================

create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'Giftty',
  logo_url text,
  favicon_url text,
  support_email text,
  support_phone text,
  business_address text,
  gst_number text,
  gst_percent numeric(5,2) not null default 18.00,
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  instagram_url text,
  facebook_url text,
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1);

alter table public.store_settings enable row level security;

create policy "anyone can read store settings"
  on public.store_settings for select using (true);
create policy "super_admin manages store settings"
  on public.store_settings for update using (public.has_role(auth.uid(), 'super_admin'));
