-- ============================================================================
-- GIFTTY v2 — MIGRATION 002: Catalog (products, variants, gift boxes)
-- Design principle applied from v1 post-mortem:
--   There is exactly ONE table the storefront reads products from, and it is
--   the SAME table the admin CRUD writes to. No static/mock file, ever.
--   Every "listable" table has BOTH status='active' AND visible=true,
--   and BOTH default to the publicly-visible value on insert.
-- ============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text unique,
  short_description text,
  long_description text,
  product_type text not null default 'normal' check (product_type in ('normal', 'personalized')),
  price_paise bigint not null check (price_paise >= 0),
  compare_at_price_paise bigint check (compare_at_price_paise >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5,
  weight_grams integer not null default 100,
  images jsonb not null default '[]'::jsonb,
  is_gift_builder_compatible boolean not null default false,
  is_personalization_enabled boolean not null default false,
  personalization_options jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  is_best_seller boolean not null default false,
  seo_title text,
  seo_description text,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "anyone can view active products"
  on public.products for select
  using (status = 'active' or public.has_role(auth.uid(), 'super_admin'));
create policy "only super_admin can insert products"
  on public.products for insert with check (public.has_role(auth.uid(), 'super_admin'));
create policy "only super_admin can update products"
  on public.products for update using (public.has_role(auth.uid(), 'super_admin'));
create policy "only super_admin can delete products"
  on public.products for delete using (public.has_role(auth.uid(), 'super_admin'));

create index products_category_idx on public.products(category_id);
create index products_status_idx on public.products(status);
create index products_slug_idx on public.products(slug);

-- ---------- PRODUCT VARIANTS (Size/Color) ----------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_type text not null check (variant_type in ('size', 'color')),
  value text not null,
  extra_price_paise bigint not null default 0,
  stock integer not null default 0 check (stock >= 0),
  sku_suffix text,
  created_at timestamptz not null default now()
);

alter table public.product_variants enable row level security;

create policy "anyone can view variants of visible products"
  on public.product_variants for select
  using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or public.has_role(auth.uid(), 'super_admin')
  );
create policy "only super_admin manages variants"
  on public.product_variants for insert with check (public.has_role(auth.uid(), 'super_admin'));
create policy "only super_admin updates variants"
  on public.product_variants for update using (public.has_role(auth.uid(), 'super_admin'));
create policy "only super_admin deletes variants"
  on public.product_variants for delete using (public.has_role(auth.uid(), 'super_admin'));

create index product_variants_product_idx on public.product_variants(product_id);

-- ---------- REVIEWS ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid, -- fk added in migration 003 after orders exists
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  images jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "anyone can view approved reviews"
  on public.reviews for select
  using (status = 'approved' or auth.uid() = user_id or public.has_role(auth.uid(), 'super_admin'));
create policy "users can create own reviews"
  on public.reviews for insert with check (auth.uid() = user_id);
create policy "users can update own pending reviews"
  on public.reviews for update using (auth.uid() = user_id and status = 'pending');
create policy "super_admin can moderate reviews"
  on public.reviews for update using (public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin can delete reviews"
  on public.reviews for delete using (public.has_role(auth.uid(), 'super_admin'));

create index reviews_product_idx on public.reviews(product_id);

-- ---------- RIBBONS / FILLERS / GREETING CARDS (admin-managed reference data) ----------
create table public.ribbons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  extra_price_paise bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'archived'))
);
create table public.fillers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  extra_price_paise bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'archived'))
);
create table public.greeting_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  default_message text,
  extra_price_paise bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'archived'))
);

alter table public.ribbons enable row level security;
alter table public.fillers enable row level security;
alter table public.greeting_cards enable row level security;

create policy "anyone can view active ribbons" on public.ribbons for select using (status = 'active' or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages ribbons" on public.ribbons for all using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

create policy "anyone can view active fillers" on public.fillers for select using (status = 'active' or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages fillers" on public.fillers for all using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

create policy "anyone can view active greeting cards" on public.greeting_cards for select using (status = 'active' or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages greeting cards" on public.greeting_cards for all using (public.has_role(auth.uid(), 'super_admin')) with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------- EMPTY GIFT BOXES (admin-built shells for the Gift Builder) ----------
create table public.empty_gift_boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  images jsonb not null default '[]'::jsonb,
  capacity integer not null check (capacity > 0),
  max_weight_grams integer not null,
  base_price_paise bigint not null default 0,
  allowed_category_ids uuid[] not null default '{}',
  allows_ribbon boolean not null default true,
  allows_filler boolean not null default true,
  allows_greeting_card boolean not null default true,
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.empty_gift_boxes enable row level security;

create policy "anyone can view active visible empty boxes"
  on public.empty_gift_boxes for select
  using ((status = 'active' and visible) or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages empty boxes"
  on public.empty_gift_boxes for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------- READY-MADE GIFT BOXES (admin-curated bundles) ----------
create table public.ready_gift_boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  images jsonb not null default '[]'::jsonb,
  price_paise bigint not null check (price_paise >= 0),
  compare_at_price_paise bigint,
  ribbon_id uuid references public.ribbons(id),
  filler_id uuid references public.fillers(id),
  greeting_card_id uuid references public.greeting_cards(id),
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ready_gift_boxes enable row level security;

create policy "anyone can view active visible ready boxes"
  on public.ready_gift_boxes for select
  using ((status = 'active' and visible) or public.has_role(auth.uid(), 'super_admin'));
create policy "super_admin manages ready boxes"
  on public.ready_gift_boxes for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create table public.ready_gift_box_items (
  id uuid primary key default gen_random_uuid(),
  ready_box_id uuid not null references public.ready_gift_boxes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0)
);

alter table public.ready_gift_box_items enable row level security;

create policy "anyone can view items of visible ready boxes"
  on public.ready_gift_box_items for select
  using (
    exists (select 1 from public.ready_gift_boxes b where b.id = ready_box_id and b.status = 'active' and b.visible)
    or public.has_role(auth.uid(), 'super_admin')
  );
create policy "super_admin manages ready box items"
  on public.ready_gift_box_items for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create index ready_box_items_box_idx on public.ready_gift_box_items(ready_box_id);
