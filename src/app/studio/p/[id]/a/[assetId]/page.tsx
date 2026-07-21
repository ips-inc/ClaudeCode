import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor, getAuthorizedAsset } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { presignGet } from "@/lib/s3";
import { FrameReview, type ReviewComment } from "@/components/review/FrameReview";
import { TagEditor } from "@/components/studio/TagEditor";
import { MultipartUploader } from "@/components/MultipartUploader";
import { allTags, assetTagsMap } from "@/lib/tags";
import { formatBytes, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Universal asset viewer. Video opens the frame-accurate review theater; images
 * and every other file open a detail view with a large preview, metadata, tags,
 * and download — so any file in the studio is one click away, Frame-style.
 *
 * Version stacks: every asset belongs to a stack rooted at the original upload.
 * The newest version is shown by default; `?v=<n>` pins an older one. Comments
 * and tags live on the individual version being viewed, so v1 feedback stays
 * with v1 when v2 lands.
 */
export default async function AssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assetId: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/studio/login");
  const { id, assetId } = await params;
  const { v } = await searchParams;

  const opened = await getAuthorizedAsset(actor, assetId);
  if (!opened || opened.project_id !== id) notFound();

  const canWrite = actor.role !== "client";
  const admin = await supabaseServer();

  // Load the whole stack this asset belongs to, oldest → newest.
  const rootId = opened.version_of ?? opened.id;
  const { data: stackRows } = await admin
    .from("assets")
    .select("id, filename, mime, size_bytes, width, height, duration_s, fps, storage_key, version, version_of, created_at")
    .or(`id.eq.${rootId},version_of.eq.${rootId}`)
    .eq("project_id", id)
    .order("version");
  const stack = stackRows?.length ? stackRows : [opened];

  const pinned = v ? stack.find((s) => String(s.version) === v) : undefined;
  const asset = pinned ?? stack[stack.length - 1]; // default: newest version
  const head = stack[stack.length - 1];

  const [vocabulary, tagMap] = await Promise.all([allTags(), assetTagsMap([asset.id])]);
  const tags = tagMap.get(asset.id) ?? [];

  const isVideo = (asset.mime ?? "").startsWith("video/");
  const isImage = (asset.mime ?? "").startsWith("image/");

  const versionStrip =
    stack.length > 1 ? (
      <div className="mb-4 flex flex-wrap items-center gap-1.5" aria-label="Versions">
        <span className="kicker mr-1">Versions</span>
        {stack.map((s) => {
          const on = s.id === asset.id;
          return (
            <Link
              key={s.id}
              href={`/studio/p/${id}/a/${assetId}${s.id === head.id ? "" : `?v=${s.version}`}`}
              className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition ${
                on
                  ? "border-[color:var(--color-accent)] [color:var(--color-accent)]"
                  : "hairline [color:var(--color-dim)] hover:[color:var(--color-ink)]"
              }`}
              title={`${s.filename} · ${formatDate(s.created_at)}`}
            >
              v{s.version}
              {s.id === head.id ? " · latest" : ""}
            </Link>
          );
        })}
      </div>
    ) : null;

  const newVersionUploader = canWrite ? (
    <MultipartUploader
      projectId={id}
      versionOf={rootId}
      label={`Drop a file to upload v${(head.version ?? 1) + 1} of this ${isVideo ? "video" : "file"}`}
    />
  ) : null;

  // ── Video → frame-accurate review theater ──────────────────────────────
  if (isVideo) {
    const [{ data: rends }, { data: comments }] = await Promise.all([
      admin.from("renditions").select("kind, storage_key").eq("asset_id", asset.id).eq("status", "done"),
      admin
        .from("comments")
        .select("id, parent_id, author_id, author_name, is_admin, body, timecode_s, frame, fps, resolved_at, created_at")
        .eq("asset_id", asset.id)
        .order("created_at", { ascending: true }),
    ]);

    const byKind = new Map((rends ?? []).map((r) => [r.kind, r.storage_key]));
    const proxyKey = byKind.get("proxy") ?? asset.storage_key;
    const posterKey = byKind.get("poster");

    const { data: transcript } = await admin
      .from("transcripts")
      .select("vtt_key, status")
      .eq("asset_id", asset.id)
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
        <Link href={`/studio/p/${id}`} className="kicker hover:[color:var(--color-ink)]">← Back to project</Link>
        <h1 className="display mt-3 mb-3 text-2xl">{asset.filename}</h1>
        {versionStrip}
        {canWrite && (
          <div className="mb-5">
            <TagEditor assetId={asset.id} projectId={id} tags={tags} vocabulary={vocabulary} />
          </div>
        )}
        {byKind.get("proxy") ? null : (
          <p className="mb-4 rounded-[var(--radius-sm)] border border-[color:var(--color-amber)]/30 bg-[color:var(--color-amber)]/10 px-3 py-2 text-[12px] [color:var(--color-amber)]">
            Playing the original — a scrubbing proxy appears once the worker finishes transcoding.
          </p>
        )}
        <FrameReview
          assetId={asset.id}
          fps={asset.fps}
          src={src}
          poster={poster}
          vttUrl={vttUrl}
          canResolve={canWrite}
          initialComments={(comments ?? []) as ReviewComment[]}
        />
        {newVersionUploader && (
          <section className="mt-8">
            <h2 className="kicker mb-3">New version</h2>
            {newVersionUploader}
          </section>
        )}
      </div>
    );
  }

  // ── Image / everything else → detail view ──────────────────────────────
  const previewSrc = isImage ? await presignGet(asset.storage_key, { ttl: 6 * 3600 }) : null;

  const meta: { label: string; value: string }[] = [
    { label: "Type", value: asset.mime ?? "—" },
    { label: "Size", value: formatBytes(asset.size_bytes ?? 0) },
    ...(asset.width && asset.height
      ? [{ label: "Dimensions", value: `${asset.width} × ${asset.height}` }]
      : []),
    ...(stack.length > 1 ? [{ label: "Version", value: `v${asset.version} of ${stack.length}` }] : []),
    { label: "Uploaded", value: formatDate(asset.created_at) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href={`/studio/p/${id}`} className="kicker hover:[color:var(--color-ink)]">← Back to project</Link>
      <h1 className="display mb-6 mt-3 text-2xl">{asset.filename}</h1>

      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        {/* Preview */}
        <div>
          {versionStrip}
          <div className="flex min-h-[40vh] items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border hairline bg-[color:var(--color-surface-2)]">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt={asset.filename} className="max-h-[72vh] w-full object-contain" />
            ) : (
              <div className="p-16 text-center">
                <p className="display text-5xl [color:var(--color-faint)]">{(asset.mime ?? "file").split("/")[1] ?? "file"}</p>
                <p className="kicker mt-4">No inline preview for this type</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <a href={`/api/media/${asset.id}?dl=1`} className="btn btn-accent w-full">Download {stack.length > 1 ? `v${asset.version}` : "original"}</a>

          <div>
            <h2 className="kicker mb-2">Tags</h2>
            {canWrite ? (
              <TagEditor assetId={asset.id} projectId={id} tags={tags} vocabulary={vocabulary} />
            ) : tags.length ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t.id} className="chip">{t.label}</span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] [color:var(--color-mute)]">No tags.</p>
            )}
          </div>

          <div>
            <h2 className="kicker mb-2">Details</h2>
            <dl className="card divide-y hairline overflow-hidden text-[13px]">
              {meta.map((m) => (
                <div key={m.label} className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                  <dt className="[color:var(--color-mute)]">{m.label}</dt>
                  <dd className="mono truncate text-right">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {newVersionUploader && (
            <div>
              <h2 className="kicker mb-2">New version</h2>
              {newVersionUploader}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
