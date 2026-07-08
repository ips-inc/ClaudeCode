"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase/anon";
import { unlockCookieName } from "@/lib/share";

/**
 * Validate a share-link password. On success the RPC returns the link id — the
 * capability that grants asset access — which we stash in an httpOnly cookie.
 * The password itself is never stored; verification happens in the database.
 */
export async function unlockShare(formData: FormData) {
  const slug = String(formData.get("slug"));
  const password = String(formData.get("password") || "");

  const { data: linkId } = await supabaseAnon().rpc("share_unlock", {
    p_slug: slug,
    p_password: password,
  });

  if (!linkId) redirect(`/s/${slug}?err=1`);

  const jar = await cookies();
  jar.set(unlockCookieName(slug), String(linkId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/s/${slug}`);
}
