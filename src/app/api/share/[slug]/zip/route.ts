import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { resolveShare, auditShare } from "@/lib/share";
import { supabaseAnon } from "@/lib/supabase/anon";
import { presignGet } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Download all" for a share link: streams every delivered file (stack heads,
 * same set the page lists) as one zip. Entries are STORED, not deflated —
 * media is already compressed, and store mode means the archive streams at
 * network speed with no CPU bottleneck, any total size (zip64 via archiver).
 *
 * Gating matches single-file downloads: the link is re-validated on request,
 * and the bundle consumes exactly ONE download slot (it is one delivery).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const share = await resolveShare(slug);
  if (share.status !== "ok") {
    return NextResponse.json({ error: share.status }, { status: 403 });
  }

  const db = supabaseAnon();
  const { data: consumed } = await db.rpc("share_consume_download", { p_link: share.linkId });
  if (!consumed) {
    return NextResponse.json({ error: "download_unavailable" }, { status: 403 });
  }

  const { data: assetRows } = await db.rpc("share_list_assets", {
    p_link_id: share.linkId,
    p_folder: null,
    p_by_folder: false,
  });
  const assets = (assetRows ?? []) as { id: string; filename: string; size_bytes: number }[];
  if (!assets.length) return NextResponse.json({ error: "empty" }, { status: 404 });

  await auditShare(share.linkId, "download_zip", { files: assets.length }, {
    ip: request.headers.get("x-forwarded-for"),
    ua: request.headers.get("user-agent"),
  });

  // Duplicate filenames get a (n) suffix so no entry silently overwrites.
  const seen = new Map<string, number>();
  const entryName = (filename: string) => {
    const n = seen.get(filename) ?? 0;
    seen.set(filename, n + 1);
    if (!n) return filename;
    const dot = filename.lastIndexOf(".");
    return dot > 0
      ? `${filename.slice(0, dot)} (${n})${filename.slice(dot)}`
      : `${filename} (${n})`;
  };

  const archive = new ZipArchive({ store: true });
  archive.on("warning", () => {});

  // Pump entries sequentially: each file is presigned and fetched only when
  // it's about to enter the archive, so connections never idle past their TTL.
  (async () => {
    for (const a of assets) {
      const name = entryName(a.filename);
      const { data: fileRows } = await db.rpc("share_file", {
        p_link_id: share.linkId,
        p_asset_id: a.id,
        p_rendition: null,
      });
      const file = (fileRows as { storage_key: string }[] | null)?.[0];
      const url = file ? await presignGet(file.storage_key, { ttl: 900 }) : null;
      const res = url ? await fetch(url).catch(() => null) : null;
      if (!res?.ok || !res.body) {
        archive.append(`This file could not be included. Download it individually from the share page.\n`, {
          name: `${name}.unavailable.txt`,
        });
        continue;
      }
      const entry = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
      archive.append(entry, { name });
      await new Promise<void>((resolve, reject) => {
        entry.once("end", () => resolve());
        entry.once("error", reject);
      });
    }
    await archive.finalize();
  })().catch((e) => archive.destroy(e instanceof Error ? e : new Error(String(e))));

  const zipName = `${share.project.title.replace(/[^\w.\- ()]/g, "_") || "delivery"}.zip`;
  return new Response(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${zipName}"`,
      "cache-control": "no-store",
    },
  });
}
