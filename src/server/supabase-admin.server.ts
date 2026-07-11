/**
 * SERVER-ONLY Supabase client using the service_role key.
 *
 * CRITICAL: never import this file from anything that runs in the browser.
 * It bypasses Row Level Security entirely. Only server functions
 * (files under src/server/ or *.server.ts) may import this.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("Missing SUPABASE_URL environment variable.");
}
if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. " +
    "Get it from Supabase Dashboard -> Project Settings -> API, and put it " +
    "in your local .env file. NEVER commit this value or paste it in chat."
  );
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
