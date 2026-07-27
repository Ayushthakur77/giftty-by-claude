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

// New-format Supabase keys (sb_publishable_..., sb_secret_...) are opaque
// strings, NOT JWTs. supabase-js still defaults to sending them as
// `Authorization: Bearer <key>` when there is no session, which PostgREST
// then fails to decode as a JWT and rejects. Stripping that header and
// relying on `apikey` alone (which PostgREST accepts for anon requests)
// fixes anonymous storefront reads.
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const supabasePublic = createClient(url, publishableKey, {
  global: {
    fetch: createSupabaseFetch(publishableKey),
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
