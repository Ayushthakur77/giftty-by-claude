/**
 * A Supabase client that NEVER attaches a user session/auth token — pure
 * anon-key requests only, with no session persistence or refresh logic.
 *
 * Why this exists separately from the main `supabase` client: public
 * storefront browsing (homepage, categories, products, search) must never
 * depend on or be affected by the current login state. The main client
 * (supabase-client.ts) persists/refreshes the user's session for
 * account-specific features (cart, wishlist, orders) — right around a
 * sign-out, that client can briefly carry a stale/just-invalidated token,
 * which PostgREST rejects as an auth error rather than treating as a clean
 * anonymous request. Using a fully separate, session-free client for public
 * reads eliminates that entire class of bug structurally: browsing the
 * store can never break because of what's happening with login state.
 */
import { createClient } from "@supabase/supabase-js";

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL));
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" && (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY));

if (!url || !publishableKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabasePublic = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
