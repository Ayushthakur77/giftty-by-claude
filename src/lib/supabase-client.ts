/**
 * Browser-side Supabase client.
 * Uses ONLY the publishable/anon key — safe to ship to the browser.
 * Respects Row Level Security on every query. Never import service-role
 * logic into this file or anything that imports it.
 */
import { createClient } from "@supabase/supabase-js";

// Vite inlines import.meta.env.VITE_* at build time for the CLIENT bundle
// reliably. Under Nitro's SSR server bundle on Vercel, that inlining is not
// always reliable at request-runtime — fall back to process.env (both the
// VITE_-prefixed and plain names) so this works in both contexts.
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL));
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" && (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY));

if (!url || !publishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Check your .env file."
  );
}

// New-format Supabase keys (sb_publishable_..., sb_secret_...) are opaque
// strings, NOT JWTs. supabase-js still defaults to sending them as
// `Authorization: Bearer <key>` when there is no active session. PostgREST
// tries to decode that header as a JWT, fails, and rejects the request —
// which is why logged-out visitors saw no products/categories while logged
// -in users (who have a real session JWT overriding that header) were fine.
// Stripping the bogus Authorization header and relying on the `apikey`
// header alone (which PostgREST accepts for anon-role requests) fixes this.
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

export const supabase = createClient(url, publishableKey, {
  global: {
    fetch: createSupabaseFetch(publishableKey),
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
