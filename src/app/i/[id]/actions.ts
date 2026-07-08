"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * A client approves or declines one of their estimates. The transition is
 * enforced in the database (finance_respond re-checks the caller is a client
 * with access), so this just forwards the decision.
 */
export async function respondToEstimate(formData: FormData) {
  const actor = await getActor();
  if (!actor) throw new Error("Unauthorized");
  const docId = String(formData.get("docId"));
  const approve = formData.get("approve") === "true";
  await (await supabaseServer()).rpc("finance_respond", { p_doc: docId, p_approve: approve });
  revalidatePath(`/i/${docId}`);
}
