-- ============================================================================
-- GIFTTY v2 — MIGRATION 006: Storage bucket for product/box/banner images
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('giftty-images', 'giftty-images', true)
on conflict (id) do nothing;

-- Anyone can view images (public bucket — needed for storefront display).
create policy "anyone can view giftty images"
  on storage.objects for select
  using (bucket_id = 'giftty-images');

-- Only super_admin can upload/update/delete.
create policy "super_admin can upload giftty images"
  on storage.objects for insert
  with check (bucket_id = 'giftty-images' and public.has_role(auth.uid(), 'super_admin'));

create policy "super_admin can update giftty images"
  on storage.objects for update
  using (bucket_id = 'giftty-images' and public.has_role(auth.uid(), 'super_admin'));

create policy "super_admin can delete giftty images"
  on storage.objects for delete
  using (bucket_id = 'giftty-images' and public.has_role(auth.uid(), 'super_admin'));
