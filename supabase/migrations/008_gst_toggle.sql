-- ============================================================================
-- GIFTTY v2 — MIGRATION 008: GST admin control
-- ============================================================================

alter table public.store_settings add column if not exists gst_enabled boolean not null default true;
