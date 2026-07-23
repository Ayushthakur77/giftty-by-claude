-- ============================================================================
-- GIFTTY v2 — MIGRATION 010: Admin visibility for wallet transactions & notifications
-- (audit/support capability — not a security fix, these were already
--  correctly locked to their owning user; this only adds admin oversight)
-- ============================================================================

create policy "super_admin views all wallet transactions"
  on public.wallet_transactions for select
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "super_admin views all notifications"
  on public.notifications for select
  using (public.has_role(auth.uid(), 'super_admin'));
