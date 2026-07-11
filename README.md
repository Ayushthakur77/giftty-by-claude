# Giftty v2

Personalized gifting e-commerce platform for India — full rebuild, built with lessons learned
from v1 baked into the architecture from day one (see "Design principles" below).

## Stack

React + TanStack Start (file-based routing) + Tailwind CSS + Supabase (Auth/DB/Storage) + Razorpay + Gemini AI.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your real values — see below
npm run dev
```

App runs at `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Where to get it | Safe to expose to browser? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same page, "anon public" / "publishable" key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, "service_role" key | **NO — server only, never commit, never share in chat** |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys | Yes (frontend uses this to open checkout) |
| `RAZORPAY_KEY_SECRET` | Same page | **NO — server only** |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Settings → Webhooks | **NO — server only** |
| `GEMINI_API_KEY` | Google AI Studio | **NO — server only** |

`.env` is gitignored from commit #1 — it will never be pushed to this repo.

## Database

All schema lives in `supabase/migrations/`, applied in order (001 → 004) via the Supabase
Dashboard SQL Editor. See migration file headers for what each one does.

### Becoming Super Admin

Public sign-up only ever grants the `customer` role (enforced server-side, not just in the UI).
To become Super Admin after signing up normally:

```sql
insert into public.user_roles (user_id, role)
values ('YOUR-USER-UUID-FROM-AUTH-USERS-TABLE', 'super_admin')
on conflict (user_id, role) do nothing;
```

Run this once in the Supabase SQL Editor.

## Design principles (carried over from the v1 post-mortem)

1. **One auth system only.** Supabase Auth end to end — no parallel custom session/cookie system.
2. **One catalog source of truth.** The storefront and the admin CRUD read/write the exact same
   Supabase tables. There is no static/mock catalog file anywhere in this codebase.
3. **Pricing is a pure function requiring a real snapshot.** `src/lib/pricing.ts`'s `priceCart()`
   takes a `CatalogSnapshot` as a *required* argument (no default value) — loaded fresh from the
   database via `loadCatalogSnapshot()` on every single pricing call. There is no way to
   accidentally price against stale or empty data without a TypeScript error.
4. **Coupon and wallet balance changes are atomic SQL operations** (`redeem_coupon()`,
   `apply_wallet_transaction()` — both `SECURITY DEFINER` Postgres functions using a single
   `UPDATE ... WHERE` statement), never a read-then-write from application code. This eliminates
   an entire class of race condition that affected v1.
5. **State-wise delivery charges from day one** — all 36 states/UTs seeded in migration 003.
   No flat-rate constant anywhere.
6. **RLS is enabled in the same migration a table is created in**, never added later.

## Project status

See `PROJECT_STATUS.md` for what's built vs. what's still pending.
