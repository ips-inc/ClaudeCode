import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cookie-session client for the logged-in admin (RSCs, server actions, route handlers). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
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
