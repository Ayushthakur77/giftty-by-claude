-- ============================================================================
-- GIFTTY v2 — MIGRATION 014: occasion_tags on products
-- ============================================================================
-- Backs the homepage/footer "Shop by Occasion" links with real filtering
-- instead of relying on free-text search matching words in the product
-- name/description. Admin picks one or more occasions per product; storefront
-- filters on this column directly.

alter table public.products
  add column occasion_tags text[] not null default '{}';

create index idx_products_occasion_tags on public.products using gin (occasion_tags);
