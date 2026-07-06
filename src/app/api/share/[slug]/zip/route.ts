import { NextRequest, NextResponse } from "next/server";
import { Zip, ZipPassThrough } from "fflate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity, resolveShare, signedUrl } from "@/lib/share";
import type { Asset, Folder } from "@/lib/types";

export const runtime = "nodejs";
// Streaming a large archive can exceed serverless defaults.
export const maxDuration = 300;

function zipSafe(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const folderId = request.nextUrl.searchParams.get("folder");

  const share = await resolveShare(slug);
  if (share.status !== "ok") {
    return NextResponse.json({ error: share.status }, { status: 403 });
  }
  if (!share.link.allow_downloads) {
    return NextResponse.json({ error: "downloads_disabled" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const [{ data: assets }, { data: folders }] = await Promise.all([
    db
      .from("assets")
      .select("*")
      .eq("project_id", share.project.id)
      .order("position")
      .order("created_at"),
    db.from("folders").select("*").eq("project_id", share.project.id),
  ]);

  // Build folder paths so drive zips keep their hierarchy.
  const folderById = new Map((folders ?? []).map((f: Folder) => [f.id, f]));
  function folderPath(id: string | null): string {
    const parts: string[] = [];
    let cur = id ? folderById.get(id) : undefined;
    while (cur) {
      parts.unshift(zipSafe(cur.name));
      cur = cur.parent_id ? folderById.get(cur.parent_id) : undefined;
    }
    return parts.length ? parts.join("/") + "/" : "";
  }

  let list = (assets ?? []) as Asset[];
  if (folderId) {
    // Restrict to the requested folder subtree.
    const subtree = new Set<string>([folderId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of folders ?? []) {
        if (f.parent_id && subtree.has(f.parent_id) && !subtree.has(f.id)) {
          subtree.add(f.id);
          grew = true;
        }
      }
    }
    list = list.filter((a) => a.folder_id && subtree.has(a.folder_id));
  }
  if (!list.length) {
    return NextResponse.json({ error: "empty" }, { status: 404 });
  }

  const { data: allowed } = await db.rpc("increment_download", {
    link_id: share.link.id,
  });
  if (!allowed) {
    return NextResponse.json({ error: "download_limit_reached" }, { status: 403 });
  }
  await logActivity(share.project.id, "download", share.link.id, {
    filename: `${list.length} files (zip)`,
  });

  // Dedupe entry names inside the archive.
  const seen = new Map<string, number>();
  function entryName(a: Asset) {
    const base = folderPath(a.folder_id) + zipSafe(a.filename);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    if (n === 0) return base;
    const dot = base.lastIndexOf(".");
    return dot > 0
      ? `${base.slice(0, dot)} (${n})${base.slice(dot)}`
      : `${base} (${n})`;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let failed = false;
      const zip = new Zip((err, chunk, final) => {
        if (failed) return;
        if (err) {
          failed = true;
          controller.error(err);
          return;
        }
        controller.enqueue(chunk);
        if (final) controller.close();
      });

      try {
        for (const asset of list) {
          const entry = new ZipPassThrough(entryName(asset));
          zip.add(entry);
          const url = await signedUrl(asset.storage_path, { ttl: 3600 });
          if (!url) throw new Error(`sign failed: ${asset.storage_path}`);
          const res = await fetch(url);
          if (!res.ok || !res.body) {
            throw new Error(`fetch failed: ${asset.storage_path}`);
          }
          const reader = res.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            entry.push(value);
            // Rudimentary backpressure so huge archives don't buffer in memory.
            while (controller.desiredSize !== null && controller.desiredSize <= 0) {
              await new Promise((r) => setTimeout(r, 15));
            }
          }
          entry.push(new Uint8Array(0), true);
        }
        zip.end();
      } catch (err) {
        if (!failed) {
          failed = true;
          controller.error(err);
        }
      }
    },
  }, new ByteLengthQueuingStrategy({ highWaterMark: 8 * 1024 * 1024 }));

  const zipName = zipSafe(share.project.title || "files") + ".zip";
  return new Response(stream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${zipName}"`,
      "cache-control": "no-store",
    },
  });
}
