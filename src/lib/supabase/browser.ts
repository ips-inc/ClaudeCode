import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

export function supabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
