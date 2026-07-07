import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor, getAuthorizedAsset } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { presignGet } from "@/lib/s3";
import { FrameReview, type ReviewComment } from "@/components/review/FrameReview";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string; assetId: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/studio/login");
  const { id, assetId } = await params;

  const asset = await getAuthorizedAsset(actor, assetId);
  if (!asset || asset.project_id !== id) notFound();

  const admin = supabaseAdmin();
  const [{ data: rends }, { data: comments }] = await Promise.all([
    admin.from("renditions").select("kind, storage_key").eq("asset_id", assetId).eq("status", "done"),
    admin
      .from("comments")
      .select("id, parent_id, author_id, author_name, is_admin, body, timecode_s, frame, fps, resolved_at, created_at")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: true }),
  ]);

  const byKind = new Map((rends ?? []).map((r) => [r.kind, r.storage_key]));
  const proxyKey = byKind.get("proxy") ?? asset.storage_key;
  const posterKey = byKind.get("poster");

  // Caption sidecar (if the transcription job produced one).
  const { data: transcript } = await admin
    .from("transcripts")
    .select("vtt_key, status")
    .eq("asset_id", assetId)
    .maybeSingle();

  const [src, poster, vttUrl] = await Promise.all([
    presignGet(proxyKey, { ttl: 6 * 3600 }),
    posterKey ? presignGet(posterKey, { ttl: 6 * 3600 }) : Promise.resolve(null),
    transcript?.vtt_key && transcript.status === "done"
      ? presignGet(transcript.vtt_key, { ttl: 6 * 3600 })
      : Promise.resolve(null),
  ]);
  if (!src) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href={`/studio/p/${id}`} className="text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-600">
        ← {asset.filename}
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-medium">{asset.filename}</h1>
      {byKind.get("proxy") ? null : (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Playing the original — a scrubbing proxy will appear once the worker finishes transcoding.
        </p>
      )}
      <FrameReview
        assetId={assetId}
        fps={asset.fps}
        src={src}
        poster={poster}
        vttUrl={vttUrl}
        canResolve={actor.role !== "client"}
        initialComments={(comments ?? []) as ReviewComment[]}
      />
    </div>
  );
}
