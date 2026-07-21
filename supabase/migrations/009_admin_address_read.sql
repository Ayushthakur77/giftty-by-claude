-- ============================================================================
-- GIFTTY v2 — MIGRATION 009: Admin read access to addresses
-- (needed so the shared invoice page's address join works when a
--  Super Admin views a customer's invoice, not just the customer themself)
-- ============================================================================

create policy "super_admin views all addresses"
  on public.addresses for select
  using (public.has_role(auth.uid(), 'super_admin'));
