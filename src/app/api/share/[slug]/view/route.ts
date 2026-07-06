import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity, resolveShare } from "@/lib/share";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const share = await resolveShare(slug);
  if (share.status !== "ok") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const db = supabaseAdmin();
  await db.rpc("increment_view", { link_id: share.link.id });
  await logActivity(share.project.id, "view", share.link.id);
  return NextResponse.json({ ok: true });
}
