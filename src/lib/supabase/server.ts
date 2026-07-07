import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cleanEnv } from "@/lib/env";

/** Cookie-session client for the logged-in admin (RSCs, server actions, route handlers). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          list: { name: string; value: string; options?: object }[]
        ) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from an RSC — middleware handles session refresh.
          }
        },
      },
    }
  );
}
