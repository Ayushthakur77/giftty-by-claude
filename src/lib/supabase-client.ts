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

// TEMPORARY DIAGNOSTIC — remove after root cause is found.
if (typeof process !== "undefined") {
  console.log(
    "[env-diagnostic] process.env keys containing SUPABASE:",
    Object.keys(process.env).filter((k) => k.includes("SUPABASE"))
  );
} else {
  console.log("[env-diagnostic] typeof process === 'undefined' in this context");
}

if (!url || !publishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Check your .env file."
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
