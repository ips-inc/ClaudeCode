import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { signedUrlMap } from "@/lib/storage";
import { addAdminComment, toggleResolveComment } from "@/app/studio/actions";
import { ReviewViewer } from "@/components/ReviewViewer";
import { Uploader } from "@/components/Uploader";
import { formatBytes, formatDate } from "@/lib/format";
import type { Asset, Comment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assetId: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id, assetId } = await params;
  const { v } = await searchParams;
  const supabase = await supabaseServer();

  const { data: root } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", id)
    .maybeSingle();
  if (!root) notFound();

  const { data: laterVersions } = await supabase
    .from("assets")
    .select("*")
    .eq("version_of", assetId)
    .order("created_at");

  const versions: Asset[] = [root as Asset, ...((laterVersions ?? []) as Asset[])];
  const current =
    versions.find((a) => a.id === v) ?? versions[versions.length - 1];

  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("asset_id", current.id)
    .order("created_at");

  const urls = await signedUrlMap([current.storage_path], 6 * 3600);
  const src = urls.get(current.storage_path);
  if (!src) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="microlabel mb-2">
          <Link href={`/studio/p/${id}`} className="hover:text-(--color-ink)">
            ← Back to project
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="display text-3xl">{current.filename}</h1>
          <span className="text-xs text-(--color-stone)">
            {formatBytes(current.size_bytes)} · uploaded {formatDate(current.created_at)}
          </span>
        </div>
        {versions.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {versions.map((ver, i) => (
              <Link
                key={ver.id}
                href={`/studio/p/${id}/a/${assetId}?v=${ver.id}`}
                className={`border px-2 py-0.5 text-[11px] tracking-wider uppercase ${
                  ver.id === current.id
                    ? "border-(--color-ink) bg-(--color-ink) text-(--color-paper)"
                    : "hairline hover:border-(--color-ink)"
                }`}
              >
                v{i + 1}
              </Link>
            ))}
          </div>
        )}
      </div>

      <ReviewViewer
        src={src}
        mime={current.mime}
        filename={current.filename}
        comments={(comments ?? []) as Comment[]}
        isAdmin
        allowComments
        hiddenFields={{ assetId: current.id, projectId: id }}
        submitAction={addAdminComment}
        resolveAction={toggleResolveComment}
      />

      <section className="max-w-xl">
        <h2 className="microlabel mb-3 border-b hairline pb-2">
          Upload new version
        </h2>
        <Uploader
          projectId={id}
          versionOf={assetId}
          label="Drop the next cut here"
        />
      </section>
    </div>
  );
}
