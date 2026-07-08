import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

/**
 * Anonymous, session-less client for public share access. Public visitors have
 * no login; every read goes through the SECURITY DEFINER share_* RPCs (which
 * re-validate the link on each call), so this holds only the anon key — never
 * the service role. Fixes the old coupling of client delivery to a secret that
 * had to be pasted perfectly into the deploy env.
 */
export function supabaseAnon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
