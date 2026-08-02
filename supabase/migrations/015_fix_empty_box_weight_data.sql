-- ============================================================================
-- GIFTTY v2 — MIGRATION 015: Fix bad max_weight_grams data on empty boxes
-- ============================================================================
-- Two empty gift boxes were created with max_weight_grams = 50 (fifty grams)
-- -- almost certainly a typo (500g / 5000g were likely intended), since even
-- the single lightest product in the catalog weighs 70g. This made every
-- custom gift box built from those two boxes fail pricing with "Box exceeds
-- max weight of 50g" and silently blocked checkout (the Place Order button
-- stays disabled whenever the price preview reports any line error). Applied
-- directly to the live DB on 2026-08-02; this migration persists that fix so
-- a fresh db reset reproduces the working state, and adds a floor so it's
-- harder to reintroduce by accident.

update public.empty_gift_boxes
set max_weight_grams = 1000
where max_weight_grams < 200;

alter table public.empty_gift_boxes
  add constraint empty_gift_boxes_max_weight_sane check (max_weight_grams >= 200);
