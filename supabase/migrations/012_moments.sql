-- ============================================================================
-- GIFTTY v2 — MIGRATION 012: Giftty Moments (shareable surprise pages)
-- ============================================================================
-- MVP of the "Giftty Moments" surprise-page platform (see PRD): a curated
-- set of templates (birthday, love letter, ...) that any signed-in user can
-- fill in with their own text/images/colors and publish to a short public
-- link (giftty.in/s/<slug>) that anyone (logged out included) can open.

-- ---------------------------------------------------------------------------
-- templates: curated, admin-managed template catalog
-- ---------------------------------------------------------------------------
create table public.moments_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null, -- 'romantic' | 'birthday' | 'friendship' | 'family' | 'festival'
  description text,
  thumbnail_url text,
  -- Ordered list of editable fields the editor UI renders for this template.
  -- Each item: { key, label, type: 'text'|'textarea'|'date'|'image'|'gallery', placeholder?, max_length? }
  fields_schema jsonb not null default '[]'::jsonb,
  default_theme_color text not null default '#7a1f3d',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_moments_templates_active on public.moments_templates(is_active, display_order);

alter table public.moments_templates enable row level security;

create policy "anyone can view active moment templates"
  on public.moments_templates for select
  using (is_active = true or public.has_role(auth.uid(), 'super_admin'));

create policy "super_admin can manage moment templates"
  on public.moments_templates for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ---------------------------------------------------------------------------
-- user_pages: a user's published (or draft) instance of a template
-- ---------------------------------------------------------------------------
create table public.moments_pages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.moments_templates(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique, -- short random code, e.g. "abc123"
  title text,
  data_json jsonb not null default '{}'::jsonb, -- values for template.fields_schema
  theme_color text,
  font_style text default 'elegant', -- 'romantic' | 'cute' | 'minimal' | 'elegant'
  music_url text,
  is_published boolean not null default false,
  is_premium boolean not null default false, -- removes "Made with Giftty" branding (future paid plan)
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_moments_pages_user on public.moments_pages(user_id, created_at desc);
create index idx_moments_pages_slug on public.moments_pages(slug);

alter table public.moments_pages enable row level security;

-- Published pages are public by design (they're shareable links) — anyone
-- with the slug (logged in or not) can open them. Owners can also see their
-- own unpublished drafts.
create policy "anyone can view published moment pages"
  on public.moments_pages for select
  using (is_published = true or user_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));

create policy "users can create their own moment pages"
  on public.moments_pages for insert
  with check (user_id = auth.uid());

create policy "users can update their own moment pages"
  on public.moments_pages for update
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));

create policy "users can delete their own moment pages"
  on public.moments_pages for delete
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));

create or replace function public.moments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.moments_pages
  for each row execute function public.moments_set_updated_at();

-- Anon can't UPDATE moments_pages directly (no policy grants it), so a
-- SECURITY DEFINER RPC is the safe way to let receivers bump the view
-- counter without exposing arbitrary field writes.
create or replace function public.increment_moment_page_views(page_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.moments_pages
  set views = views + 1
  where slug = page_slug and is_published = true;
$$;

revoke execute on function public.increment_moment_page_views(text) from public;
grant execute on function public.increment_moment_page_views(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for user-uploaded moment images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('giftty-moments', 'giftty-moments', true)
on conflict (id) do nothing;

create policy "anyone can view moment images"
  on storage.objects for select
  using (bucket_id = 'giftty-moments');

-- Any signed-in user can upload — this is user-generated content, not
-- admin-managed like the main product image bucket.
create policy "authenticated users can upload moment images"
  on storage.objects for insert
  with check (bucket_id = 'giftty-moments' and auth.role() = 'authenticated');

create policy "users can update their own moment images"
  on storage.objects for update
  using (bucket_id = 'giftty-moments' and owner = auth.uid());

create policy "users can delete their own moment images"
  on storage.objects for delete
  using (bucket_id = 'giftty-moments' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed: two starter templates (Birthday Surprise, Love Letter)
-- ---------------------------------------------------------------------------
insert into public.moments_templates (slug, title, category, description, fields_schema, default_theme_color, display_order)
values
(
  'birthday-surprise',
  'Birthday Surprise',
  'birthday',
  'A joyful animated birthday reveal with photos and a heartfelt message.',
  '[
    {"key":"recipient_name","label":"Their name","type":"text","placeholder":"e.g. Riya","max_length":40},
    {"key":"headline","label":"Headline","type":"text","placeholder":"Happy Birthday!","max_length":60},
    {"key":"message","label":"Your message","type":"textarea","placeholder":"Write your birthday wish...","max_length":600},
    {"key":"photo_1","label":"Photo 1","type":"image"},
    {"key":"photo_2","label":"Photo 2","type":"image"},
    {"key":"photo_3","label":"Photo 3","type":"image"}
  ]'::jsonb,
  '#c9184a',
  1
),
(
  'love-letter',
  'Love Letter',
  'romantic',
  'A romantic letter-opening experience with your own words and photos.',
  '[
    {"key":"recipient_name","label":"Their name","type":"text","placeholder":"e.g. Aman","max_length":40},
    {"key":"headline","label":"Headline","type":"text","placeholder":"To the love of my life","max_length":60},
    {"key":"message","label":"Your letter","type":"textarea","placeholder":"Dear...","max_length":1000},
    {"key":"signoff","label":"Sign off","type":"text","placeholder":"Forever yours, ...","max_length":60},
    {"key":"photo_1","label":"Photo 1","type":"image"},
    {"key":"photo_2","label":"Photo 2","type":"image"}
  ]'::jsonb,
  '#7a1f3d',
  2
)
on conflict (slug) do nothing;
