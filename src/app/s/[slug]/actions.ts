"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { unlockCookieName, unlockCookieValue } from "@/lib/share";

/** Validate a share-link password and set the unlock cookie. */
export async function unlockShare(formData: FormData) {
  const slug = String(formData.get("slug"));
  const password = String(formData.get("password") || "");

  const { data: link } = await supabaseAdmin()
    .from("share_links")
    .select("password_hash, revoked_at, expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!link || link.revoked_at) redirect(`/s/${slug}`);
  const ok = !!link.password_hash && (await bcrypt.compare(password, link.password_hash));
  if (!ok) redirect(`/s/${slug}?err=1`);

  const jar = await cookies();
  jar.set(unlockCookieName(slug), await unlockCookieValue(slug), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/s/${slug}`);
}
