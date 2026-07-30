-- ============================================================================
-- GIFTTY v2 — MIGRATION 011: Fix anon EXECUTE grant on has_role()
-- ============================================================================
-- Migration 001 revoked EXECUTE on has_role() from anon (line: "revoke
-- execute ... from public, anon"). Most public-read RLS policies are written
-- as `status = 'active' OR has_role(auth.uid(), 'super_admin')` — Postgres
-- must be able to evaluate the whole boolean expression, so the anon role
-- needs EXECUTE on has_role() even though it's SECURITY DEFINER and even
-- when the first OR-branch alone would be true. Without this grant, every
-- anonymous (logged-out) read on products/categories/ready_gift_boxes/etc
-- failed with 42501 "permission denied for function has_role" — this was
-- the root cause of "no products show before login". Applied directly to
-- the live DB on 2026-07-28; this migration just persists that fix so a
-- fresh `supabase db reset` reproduces the working state.

grant execute on function public.has_role(uuid, public.app_role) to anon;
