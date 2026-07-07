"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { TAG_COLORS } from "@/lib/tag-colors";

/** Owner/collaborator guard (clients can't tag). Mirrors studio/actions.ts. */
async function requireMember() {
  const actor = await getActor();
  if (!actor || actor.role === "client") throw new Error("Forbidden");
  return actor;
}

/** Attach an existing tag to an asset. */
export async function assignTag(assetId: string, projectId: string, tagId: string) {
  const actor = await requireMember();
  const db = await supabaseServer();
  // upsert-ish: ignore if the pair already exists (composite PK).
  await db.from("asset_tags").upsert(
    { asset_id: assetId, tag_id: tagId, created_by: actor.id },
    { onConflict: "asset_id,tag_id", ignoreDuplicates: true }
  );
  revalidatePath(`/studio/p/${projectId}`);
}

/** Create a new tag in the studio vocabulary and attach it to an asset. */
export async function createAndAssignTag(
  assetId: string,
  projectId: string,
  label: string,
  color: string
) {
  const actor = await requireMember();
  const clean = label.trim().slice(0, 40);
  if (!clean) return;
  const safeColor = (TAG_COLORS as readonly string[]).includes(color) ? color : "gray";
  const db = await supabaseServer();

  // Reuse an existing tag with the same label (case-insensitive) rather than
  // erroring on the unique index; otherwise create it.
  const { data: existing } = await db
    .from("tags")
    .select("id")
    .ilike("label", clean)
    .maybeSingle();

  let tagId = existing?.id;
  if (!tagId) {
    const { data: created, error } = await db
      .from("tags")
      .insert({ label: clean, color: safeColor, created_by: actor.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    tagId = created.id;
  }

  await db.from("asset_tags").upsert(
    { asset_id: assetId, tag_id: tagId, created_by: actor.id },
    { onConflict: "asset_id,tag_id", ignoreDuplicates: true }
  );
  revalidatePath(`/studio/p/${projectId}`);
}

/** Remove a tag from an asset (leaves the tag in the vocabulary). */
export async function unassignTag(assetId: string, projectId: string, tagId: string) {
  await requireMember();
  const db = await supabaseServer();
  await db.from("asset_tags").delete().eq("asset_id", assetId).eq("tag_id", tagId);
  revalidatePath(`/studio/p/${projectId}`);
}
