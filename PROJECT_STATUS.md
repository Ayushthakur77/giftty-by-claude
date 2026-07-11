# Giftty v2 — Project Status

Last updated: build session with Claude.

## ✅ Done

- Full database schema (4 migrations) — identity/roles, catalog, orders/coupons/delivery/wallet,
  wishlist/notifications/misc — applied and live on the project's Supabase instance.
- Project scaffold: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`.
- Pricing engine (`src/lib/pricing.ts`) — pure function, requires a real `CatalogSnapshot`.
- Server-side Supabase admin client + catalog repository (`src/server/`).
- Auth pages: sign-up, sign-in (email/password + Google OAuth), forgot-password.
- Homepage placeholder.
- Router + client/server entry points.

## 🚧 Not yet built

- Reset-password page (the route `/auth/reset-password` is linked from forgot-password but the
  page itself doesn't exist yet).
- Account dashboard (`/account`) — sign-up/sign-in redirect here but it doesn't exist yet.
- Product listing / product detail / category pages.
- Cart, checkout, Razorpay integration (client + webhook).
- Empty Gift Box Builder, Ready-made Gift Box pages.
- Admin panel (all modules — products, categories, orders, coupons, etc.).
- AI features (Gemini integration — gift assistant, box builder, greeting cards, search).
- Wishlist UI, Notifications UI, Reviews UI.
- Homepage Builder consuming `homepage_sections`/`banners` tables (homepage is currently
  hardcoded placeholder content).
- Seed data — no ribbons/fillers/greeting cards or sample products exist yet; the admin panel
  is needed to create them (or a seed script, not yet written).

## Known setup step still needed from the project owner

- Become Super Admin (see README.md) once you've signed up through the app once.
- Fill in Razorpay and Gemini keys in `.env` when ready to wire those features up.
