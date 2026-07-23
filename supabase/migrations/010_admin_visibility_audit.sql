-- ============================================================================
-- GIFTTY v2 — MIGRATION 010: Admin visibility gaps found during security audit
-- (all additive — customer-facing access is unchanged, this only grants the
--  Super Admin read access needed for support/oversight)
-- ============================================================================

create policy "super_admin views all wallet transactions"
  on public.wallet_transactions for select
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "super_admin views all referral codes"
  on public.referral_codes for select
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "super_admin views all referral redemptions"
  on public.referral_redemptions for select
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "super_admin views all wishlists"
  on public.wishlist_items for select
  using (public.has_role(auth.uid(), 'super_admin'));
