-- ============================================================================
-- GIFTTY v2 — MIGRATION 003: Orders, Coupons, Delivery, Wallet
-- Design principles applied from v1 post-mortem:
--   1. Coupon usage_count increments happen ONLY via the atomic redeem_coupon()
--      function below — application code must never do read-then-write on it.
--   2. Delivery charges are state-wise from day 1 — no flat-rate constant.
--   3. Payment confirmation side-effects (invoice, coupon redemption,
--      notification) live in ONE function, called by both the Razorpay
--      webhook and the client-callback path — see migration 004.
-- ============================================================================

-- ---------- STATE-WISE DELIVERY CHARGES ----------
create table public.delivery_charges (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  charge_paise bigint not null default 0,
  free_shipping_threshold_paise bigint not null default 99900, -- ₹999 default
  estimated_days integer not null default 5,
  is_serviceable boolean not null default true
);

alter table public.delivery_charges enable row level security;

create policy "anyone can view delivery charges"
  on public.delivery_charges for select using (true);
create policy "super_admin manages delivery charges"
  on public.delivery_charges for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- Seed all 36 Indian states/UTs with a sensible default so checkout never
-- has to fall back to a hardcoded flat rate for a missing state.
insert into public.delivery_charges (state, charge_paise, estimated_days) values
  ('Andhra Pradesh', 7900, 5), ('Arunachal Pradesh', 15900, 8), ('Assam', 12900, 7),
  ('Bihar', 8900, 5), ('Chhattisgarh', 8900, 5), ('Goa', 7900, 4),
  ('Gujarat', 6900, 4), ('Haryana', 5900, 3), ('Himachal Pradesh', 9900, 6),
  ('Jharkhand', 8900, 5), ('Karnataka', 6900, 4), ('Kerala', 8900, 5),
  ('Madhya Pradesh', 7900, 4), ('Maharashtra', 6900, 4), ('Manipur', 15900, 8),
  ('Meghalaya', 14900, 8), ('Mizoram', 15900, 8), ('Nagaland', 15900, 8),
  ('Odisha', 8900, 5), ('Punjab', 6900, 4), ('Rajasthan', 7900, 4),
  ('Sikkim', 13900, 7), ('Tamil Nadu', 7900, 4), ('Telangana', 6900, 4),
  ('Tripura', 13900, 7), ('Uttar Pradesh', 6900, 4), ('Uttarakhand', 8900, 5),
  ('West Bengal', 7900, 4),
  ('Andaman and Nicobar Islands', 19900, 10), ('Chandigarh', 5900, 3),
  ('Dadra and Nagar Haveli and Daman and Diu', 7900, 4), ('Delhi', 4900, 2),
  ('Jammu and Kashmir', 12900, 7), ('Ladakh', 15900, 9),
  ('Lakshadweep', 19900, 10), ('Puducherry', 7900, 4);

-- ---------- COUPONS ----------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('flat', 'percent')),
  discount_value bigint not null, -- paise if flat, whole-number percent if percent
  max_discount_paise bigint, -- cap for percent-type coupons
  min_order_paise bigint not null default 0,
  usage_limit integer, -- null = unlimited
  usage_count integer not null default 0,
  per_user_limit integer not null default 1,
  first_order_only boolean not null default false,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

create policy "anyone can view active coupons to validate a code"
  on public.coupons for select using (status = 'active' or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages coupons"
  on public.coupons for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null,
  discount_paise bigint not null,
  created_at timestamptz not null default now()
);

alter table public.coupon_redemptions enable row level security;

create policy "users view own redemptions"
  on public.coupon_redemptions for select using (auth.uid() = user_id);
create policy "super_admin views all redemptions"
  on public.coupon_redemptions for select using (public.has_role(auth.uid(), 'super_admin'));

-- THE atomic redeem function — the ONLY way usage_count is ever incremented.
-- Single UPDATE statement = no read-then-write race condition, period.
create or replace function public.redeem_coupon(
  _coupon_id uuid,
  _user_id uuid,
  _order_id uuid,
  _discount_paise bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
  prior_uses_by_user integer;
  v_per_user_limit integer;
begin
  select per_user_limit into v_per_user_limit from public.coupons where id = _coupon_id;

  select count(*) into prior_uses_by_user
  from public.coupon_redemptions
  where coupon_id = _coupon_id and user_id = _user_id;

  if prior_uses_by_user >= v_per_user_limit then
    return false;
  end if;

  update public.coupons
  set usage_count = usage_count + 1
  where id = _coupon_id
    and status = 'active'
    and (usage_limit is null or usage_count < usage_limit);

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    return false;
  end if;

  insert into public.coupon_redemptions (coupon_id, user_id, order_id, discount_paise)
  values (_coupon_id, _user_id, _order_id, _discount_paise);

  return true;
end;
$$;

revoke execute on function public.redeem_coupon(uuid, uuid, uuid, bigint) from public, anon;
grant execute on function public.redeem_coupon(uuid, uuid, uuid, bigint) to authenticated, service_role;

-- ---------- WALLET / STORE CREDIT ----------
create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_paise bigint not null default 0 check (balance_paise >= 0),
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "users view own wallet"
  on public.wallets for select using (auth.uid() = user_id);
create policy "super_admin views all wallets"
  on public.wallets for select using (public.has_role(auth.uid(), 'super_admin'));

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_paise bigint not null, -- positive = credit, negative = debit
  reason text not null, -- 'referral_bonus', 'order_payment', 'refund', 'admin_adjustment'
  order_id uuid,
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

create policy "users view own wallet transactions"
  on public.wallet_transactions for select using (auth.uid() = user_id);

-- Atomic wallet credit/debit, same race-condition-safe pattern as coupons.
create or replace function public.apply_wallet_transaction(
  _user_id uuid, _amount_paise bigint, _reason text, _order_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  insert into public.wallets (user_id, balance_paise)
  values (_user_id, 0)
  on conflict (user_id) do nothing;

  update public.wallets
  set balance_paise = balance_paise + _amount_paise, updated_at = now()
  where user_id = _user_id
    and balance_paise + _amount_paise >= 0;

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    return false;
  end if;

  insert into public.wallet_transactions (user_id, amount_paise, reason, order_id)
  values (_user_id, _amount_paise, _reason, _order_id);

  return true;
end;
$$;

revoke execute on function public.apply_wallet_transaction(uuid, bigint, text, uuid) from public, anon;
grant execute on function public.apply_wallet_transaction(uuid, bigint, text, uuid) to authenticated, service_role;

-- ---------- ORDERS ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  address_id uuid not null references public.addresses(id) on delete restrict,
  order_number text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('cod', 'razorpay', 'wallet')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  subtotal_paise bigint not null,
  shipping_paise bigint not null,
  tax_paise bigint not null,
  discount_paise bigint not null default 0,
  wallet_used_paise bigint not null default 0,
  total_paise bigint not null,
  coupon_id uuid references public.coupons(id),
  razorpay_order_id text,
  razorpay_payment_id text,
  notes text,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "users view own orders"
  on public.orders for select using (auth.uid() = user_id);
create policy "super_admin views all orders"
  on public.orders for select using (public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin updates orders"
  on public.orders for update using (public.has_role(auth.uid(), 'super_admin'));
-- Note: inserts happen only via SECURITY DEFINER server functions (service role),
-- never directly from the client — see checkout functions in the app layer.

create index orders_user_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'ready_box', 'custom_box')),
  product_id uuid references public.products(id),
  ready_box_id uuid references public.ready_gift_boxes(id),
  empty_box_id uuid references public.empty_gift_boxes(id),
  name_snapshot text not null,
  unit_price_paise bigint not null,
  quantity integer not null check (quantity > 0),
  line_total_paise bigint not null,
  personalization jsonb not null default '{}'::jsonb,
  custom_box_contents jsonb, -- for custom_box: chosen products/ribbon/filler/card snapshot
  created_at timestamptz not null default now()
);

alter table public.order_items enable row level security;

create policy "users view own order items"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "super_admin views all order items"
  on public.order_items for select using (public.has_role(auth.uid(), 'super_admin'));

create index order_items_order_idx on public.order_items(order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.order_status_history enable row level security;

create policy "users view own order history"
  on public.order_status_history for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "super_admin views all order history"
  on public.order_status_history for select using (public.has_role(auth.uid(), 'super_admin'));

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  invoice_number text not null unique,
  gst_number text,
  gst_percent numeric(5,2) not null default 18.00,
  pdf_url text,
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "users view own invoices"
  on public.invoices for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "super_admin views all invoices"
  on public.invoices for select using (public.has_role(auth.uid(), 'super_admin'));

-- Add the FK from reviews to orders now that orders exists.
alter table public.reviews
  add constraint reviews_order_fk foreign key (order_id) references public.orders(id) on delete set null;
