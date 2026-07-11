-- ============================================================================
-- GIFTTY v2 — MIGRATION 004: Wishlist, Notifications, Referrals, Festivals,
--                             Homepage Builder, AI, Audit Logs, Payments
-- ============================================================================

-- ---------- WISHLIST ----------
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  ready_box_id uuid references public.ready_gift_boxes(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlist_one_target check (
    (product_id is not null and ready_box_id is null) or
    (product_id is null and ready_box_id is not null)
  ),
  unique (user_id, product_id),
  unique (user_id, ready_box_id)
);

alter table public.wishlist_items enable row level security;

create policy "users manage own wishlist"
  on public.wishlist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- NOTIFICATIONS (in-app) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'order_update', 'promo', 'birthday_reminder', 'system'
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users manage own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "users mark own notifications read"
  on public.notifications for update using (auth.uid() = user_id);

create index notifications_user_unread_idx on public.notifications(user_id, read_at);

-- ---------- REFERRALS ----------
create table public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;
create policy "users view own referral code" on public.referral_codes for select using (auth.uid() = user_id);

create table public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referrer_reward_paise bigint not null default 10000, -- ₹100 default
  referred_reward_paise bigint not null default 10000,
  status text not null default 'pending' check (status in ('pending', 'rewarded')),
  created_at timestamptz not null default now()
);

alter table public.referral_redemptions enable row level security;
create policy "users view referrals they're party to"
  on public.referral_redemptions for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

-- ---------- ABANDONED CART TRACKING ----------
create table public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  cart_snapshot jsonb not null,
  reminder_sent_at timestamptz,
  recovered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.abandoned_carts enable row level security;
create policy "users view own abandoned cart records"
  on public.abandoned_carts for select using (auth.uid() = user_id);
create policy "super_admin views all abandoned carts"
  on public.abandoned_carts for select using (public.has_role(auth.uid(), 'super_admin'));

-- ---------- HOMEPAGE BUILDER ----------
create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_type text not null, -- 'hero', 'category_grid', 'trending', 'festival', 'best_sellers', etc.
  title text,
  config jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  visible boolean not null default true
);

alter table public.homepage_sections enable row level security;
create policy "anyone can view visible homepage sections"
  on public.homepage_sections for select using (visible or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages homepage sections"
  on public.homepage_sections for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link text,
  title text,
  subtitle text,
  display_order integer not null default 0,
  visible boolean not null default true,
  start_date date,
  end_date date
);

alter table public.banners enable row level security;
create policy "anyone can view visible banners"
  on public.banners for select using (visible or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages banners"
  on public.banners for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------- AI SETTINGS & LOGS ----------
create table public.ai_settings (
  id integer primary key default 1 check (id = 1), -- singleton row
  enabled boolean not null default true,
  provider text not null default 'gemini',
  gift_recommendation_prompt text,
  box_builder_prompt text,
  greeting_card_prompt text,
  search_prompt text,
  updated_at timestamptz not null default now()
);
insert into public.ai_settings (id) values (1);

alter table public.ai_settings enable row level security;
create policy "anyone can read ai settings needed for feature flags"
  on public.ai_settings for select using (true);
create policy "super_admin manages ai settings"
  on public.ai_settings for update using (public.has_role(auth.uid(), 'super_admin'));

create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null, -- 'gift_recommendation', 'box_builder', 'greeting_card', 'search'
  input_summary text,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.ai_logs enable row level security;
create policy "super_admin views ai logs"
  on public.ai_logs for select using (public.has_role(auth.uid(), 'super_admin'));

-- ---------- AUDIT LOGS (simple version, immutable) ----------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  action text not null, -- e.g. 'product.create', 'order.status_change', 'coupon.delete'
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
create policy "super_admin views audit logs"
  on public.audit_logs for select using (public.has_role(auth.uid(), 'super_admin'));
-- No update/delete policy exists for anyone — audit logs are insert-only and immutable.

-- ---------- PAYMENTS (Razorpay transaction log) ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  amount_paise bigint not null,
  status text not null default 'created'
    check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
create policy "users view own payments"
  on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "super_admin views all payments"
  on public.payments for select using (public.has_role(auth.uid(), 'super_admin'));

create index payments_order_idx on public.payments(order_id);
create unique index payments_razorpay_order_idx on public.payments(razorpay_order_id) where razorpay_order_id is not null;
