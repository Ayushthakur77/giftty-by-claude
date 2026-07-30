-- ============================================================================
-- GIFTTY v2 — MIGRATION 013: Moments — Friendship Appreciation template
-- ============================================================================

insert into public.moments_templates (slug, title, category, description, fields_schema, default_theme_color, display_order)
values (
  'friendship-appreciation',
  'Best Friend Appreciation',
  'friendship',
  'Tell your best friend how much they mean to you, with photos and a heartfelt note.',
  '[
    {"key":"recipient_name","label":"Their name","type":"text","placeholder":"e.g. Priya","max_length":40},
    {"key":"headline","label":"Headline","type":"text","placeholder":"To My Best Friend","max_length":60},
    {"key":"message","label":"Your message","type":"textarea","placeholder":"Tell them what they mean to you...","max_length":600},
    {"key":"photo_1","label":"Photo 1","type":"image"},
    {"key":"photo_2","label":"Photo 2","type":"image"},
    {"key":"photo_3","label":"Photo 3","type":"image"}
  ]'::jsonb,
  '#2b5a8e',
  3
)
on conflict (slug) do nothing;
