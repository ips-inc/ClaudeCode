import { createClient } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/env";

/**
 * Service-role client. Server only — used by public share routes after a share
 * link has been validated, and for signed URL minting.
 */
export function supabaseAdmin() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
