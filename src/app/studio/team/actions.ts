"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";

async function requireOwner() {
  const actor = await getActor();
  if (!actor || actor.role !== "owner") throw new Error("Forbidden");
  return actor;
}

/**
 * Grant an existing account access to a client — as a collaborator (outside
 * editor / team) or a client (delivery-only). Because authz keys off the global
 * role, promoting someone to collaborator lifts their profile role too (never
 * downgrading the owner). New people must have signed up first; a full email
 * invite flow is a follow-up.
 */
export async function addMember(formData: FormData) {
  await requireOwner();
  const clientId = String(formData.get("clientId"));
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "collaborator") === "client" ? "client" : "collaborator";
  if (!email) throw new Error("Email required");
  const db = await supabaseServer();

  const { data: profile } = await db
    .from("profiles")
    .select("id, global_role")
    .ilike("email", email)
    .maybeSingle();
  if (!profile) {
    throw new Error("No account with that email yet — ask them to sign up first, then add them.");
  }

  // Lift a client to collaborator so authz treats them as a team member.
  if (role === "collaborator" && profile.global_role === "client") {
    await db.from("profiles").update({ global_role: "collaborator" }).eq("id", profile.id);
  }

  const { error } = await db
    .from("memberships")
    .upsert({ user_id: profile.id, client_id: clientId, role }, { onConflict: "user_id,client_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/studio/team");
}

export async function removeMember(formData: FormData) {
  await requireOwner();
  const membershipId = String(formData.get("membershipId"));
  await (await supabaseServer()).from("memberships").delete().eq("id", membershipId);
  revalidatePath("/studio/team");
}
