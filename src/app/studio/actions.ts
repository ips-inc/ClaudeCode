"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { projectSlug, shareSlug } from "@/lib/slug";
import type { ProjectKind } from "@/lib/types";

async function requireAdmin() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return supabase;
}

export async function createProject(formData: FormData) {
  const supabase = await requireAdmin();
  const kind = String(formData.get("kind")) as ProjectKind;
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!title) throw new Error("Title is required");

  const { data, error } = await supabase
    .from("projects")
    .insert({ kind, title, description, slug: projectSlug(title) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/studio/p/${data.id}`);
}

export async function updateProject(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const { error } = await supabase
    .from("projects")
    .update({ title, description })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/p/${id}`);
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const admin = supabaseAdmin();

  // Remove storage objects first (DB rows cascade).
  const { data: assets } = await admin
    .from("assets")
    .select("storage_path")
    .eq("project_id", id);
  const paths = (assets ?? []).map((a) => a.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from("originals").remove(paths.slice(i, i + 100));
  }
  const { error } = await admin.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/studio");
}

export async function deleteAsset(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const admin = supabaseAdmin();
  const { data: asset } = await admin
    .from("assets")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (asset) {
    await admin.storage.from("originals").remove([asset.storage_path]);
  }
  await admin.from("assets").delete().eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function renameAsset(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const filename = String(formData.get("filename") || "").trim();
  if (filename) {
    await supabase.from("assets").update({ filename }).eq("id", id);
  }
  revalidatePath(`/studio/p/${projectId}`);
}

export async function moveAsset(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const folderId = String(formData.get("folderId") || "") || null;
  await supabase.from("assets").update({ folder_id: folderId }).eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function setCover(formData: FormData) {
  const supabase = await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const assetId = String(formData.get("assetId"));
  await supabase
    .from("projects")
    .update({ cover_asset_id: assetId })
    .eq("id", projectId);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function createFolder(formData: FormData) {
  const supabase = await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const parentId = String(formData.get("parentId") || "") || null;
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await supabase
    .from("folders")
    .insert({ project_id: projectId, parent_id: parentId, name });
  revalidatePath(`/studio/p/${projectId}`);
}

export async function renameFolder(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const name = String(formData.get("name") || "").trim();
  if (name) await supabase.from("folders").update({ name }).eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function deleteFolder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const admin = supabaseAdmin();
  // Delete storage objects for all assets in this folder subtree.
  const { data: allFolders } = await admin
    .from("folders")
    .select("id, parent_id")
    .eq("project_id", projectId);
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of allFolders ?? []) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  const { data: assets } = await admin
    .from("assets")
    .select("storage_path")
    .in("folder_id", [...ids]);
  const paths = (assets ?? []).map((a) => a.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from("originals").remove(paths.slice(i, i + 100));
  }
  await admin.from("folders").delete().eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function createShareLink(formData: FormData) {
  const supabase = await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const label = String(formData.get("label") || "").trim() || null;
  const password = String(formData.get("password") || "");
  const expiresAt = String(formData.get("expiresAt") || "");
  const maxDownloads = String(formData.get("maxDownloads") || "");
  const allowDownloads = formData.get("allowDownloads") === "on";
  const allowComments = formData.get("allowComments") === "on";
  const allowFavorites = formData.get("allowFavorites") === "on";

  const { error } = await supabase.from("share_links").insert({
    project_id: projectId,
    slug: shareSlug(),
    label,
    password_hash: password ? await bcrypt.hash(password, 10) : null,
    expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    max_downloads: maxDownloads ? Number(maxDownloads) : null,
    allow_downloads: allowDownloads,
    allow_comments: allowComments,
    allow_favorites: allowFavorites,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function revokeShareLink(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function addAdminComment(formData: FormData) {
  const supabase = await requireAdmin();
  const assetId = String(formData.get("assetId"));
  const projectId = String(formData.get("projectId"));
  const body = String(formData.get("body") || "").trim();
  const timecode = String(formData.get("timecode") || "");
  const parentId = String(formData.get("parentId") || "") || null;
  if (!body) return;
  await supabase.from("comments").insert({
    asset_id: assetId,
    parent_id: parentId,
    author_name: "Isaac",
    is_admin: true,
    body,
    timecode_s: timecode !== "" ? Number(timecode) : null,
  });
  revalidatePath(`/studio/p/${projectId}`);
}

export async function toggleResolveComment(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const resolved = formData.get("resolved") === "true";
  await supabase
    .from("comments")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}
