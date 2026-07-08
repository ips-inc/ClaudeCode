"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { zohoConfigured, syncDocToZoho } from "@/lib/zoho";
import type { FinanceKind } from "@/lib/finance";

/** Money is the owner's book — collaborators (outside editors) never touch it. */
async function requireOwner() {
  const actor = await getActor();
  if (!actor || actor.role !== "owner") throw new Error("Forbidden");
  return actor;
}

/** Recompute subtotal/tax/total from the doc's line items. */
async function recompute(docId: string) {
  const db = await supabaseServer();
  const [{ data: items }, { data: doc }] = await Promise.all([
    db.from("finance_line_items").select("amount").eq("doc_id", docId),
    db.from("finance_docs").select("tax_rate").eq("id", docId).maybeSingle(),
  ]);
  const subtotal = (items ?? []).reduce((n, r) => n + Number(r.amount ?? 0), 0);
  const taxRate = Number(doc?.tax_rate ?? 0);
  const tax = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + tax;
  await db.from("finance_docs").update({ subtotal, tax, total }).eq("id", docId);
}

export async function createDoc(formData: FormData) {
  const actor = await requireOwner();
  const kind = String(formData.get("kind") || "estimate") as FinanceKind;
  const clientId = String(formData.get("clientId") || "");
  const dueDate = String(formData.get("dueDate") || "") || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!clientId) throw new Error("Client required");
  const db = await supabaseServer();

  const { data: number } = await db.rpc("finance_next_number", { p_kind: kind });
  const { data, error } = await db
    .from("finance_docs")
    .insert({
      kind,
      number: (number as string) ?? `${kind === "estimate" ? "EST" : "INV"}-0000`,
      client_id: clientId,
      due_date: dueDate,
      notes,
      status: "draft",
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/studio/money/${data.id}`);
}

export async function addLineItem(formData: FormData) {
  await requireOwner();
  const docId = String(formData.get("docId"));
  const description = String(formData.get("description") || "").trim();
  const qty = Number(formData.get("qty") || 1) || 1;
  const unitPrice = Number(formData.get("unitPrice") || 0) || 0;
  if (!description) return;
  const db = await supabaseServer();
  // Line items are immutable once the doc has been sent — what the client saw
  // is what the books show.
  const { data: doc } = await db.from("finance_docs").select("status").eq("id", docId).maybeSingle();
  if (doc?.status !== "draft") throw new Error("Document already sent");
  const { count } = await db
    .from("finance_line_items")
    .select("id", { count: "exact", head: true })
    .eq("doc_id", docId);
  await db.from("finance_line_items").insert({
    doc_id: docId,
    description,
    qty,
    unit_price: unitPrice,
    amount: Math.round(qty * unitPrice * 100) / 100,
    position: count ?? 0,
  });
  await recompute(docId);
  revalidatePath(`/studio/money/${docId}`);
}

export async function deleteLineItem(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const docId = String(formData.get("docId"));
  const db = await supabaseServer();
  const { data: doc } = await db.from("finance_docs").select("status").eq("id", docId).maybeSingle();
  if (doc?.status !== "draft") throw new Error("Document already sent");
  await db.from("finance_line_items").delete().eq("id", id).eq("doc_id", docId);
  await recompute(docId);
  revalidatePath(`/studio/money/${docId}`);
}

export async function updateDocMeta(formData: FormData) {
  await requireOwner();
  const docId = String(formData.get("docId"));
  const dueDate = String(formData.get("dueDate") || "") || null;
  const taxRate = Number(formData.get("taxRate") || 0) || 0;
  const notes = String(formData.get("notes") || "").trim() || null;
  const terms = String(formData.get("terms") || "").trim() || null;
  const db = await supabaseServer();
  await db.from("finance_docs").update({ due_date: dueDate, tax_rate: taxRate, notes, terms }).eq("id", docId);
  await recompute(docId);
  revalidatePath(`/studio/money/${docId}`);
}

export async function sendDoc(formData: FormData) {
  await requireOwner();
  const docId = String(formData.get("docId"));
  const db = await supabaseServer();
  await db
    .from("finance_docs")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", docId)
    .eq("status", "draft");
  // Mirror into Zoho Books when configured — best-effort, never blocks the send.
  if (zohoConfigured()) {
    try {
      await syncDocToZoho(docId);
    } catch {
      // surfaced separately via the manual sync button
    }
  }
  revalidatePath(`/studio/money/${docId}`);
}

/** Manually (re)sync a doc to Zoho Books. */
export async function syncZoho(formData: FormData) {
  await requireOwner();
  const docId = String(formData.get("docId"));
  await syncDocToZoho(docId);
  revalidatePath(`/studio/money/${docId}`);
}

export async function recordPayment(formData: FormData) {
  await requireOwner();
  const docId = String(formData.get("docId"));
  const amount = Number(formData.get("amount") || 0) || 0;
  const method = String(formData.get("method") || "other");
  const reference = String(formData.get("reference") || "").trim() || null;
  if (amount <= 0) return;
  const db = await supabaseServer();
  const { data: doc } = await db
    .from("finance_docs")
    .select("kind, status, total, amount_paid")
    .eq("id", docId)
    .maybeSingle();
  // Payments apply to sent invoices only — estimates and drafts have no balance.
  if (doc?.kind !== "invoice" || doc.status === "draft") throw new Error("Not a payable invoice");
  await db.from("finance_payments").insert({ doc_id: docId, amount, method, reference });
  const paid = Number(doc?.amount_paid ?? 0) + amount;
  const fullyPaid = paid >= Number(doc?.total ?? 0) - 0.005;
  await db
    .from("finance_docs")
    .update({
      amount_paid: paid,
      status: fullyPaid ? "paid" : undefined,
      paid_at: fullyPaid ? new Date().toISOString() : null,
    })
    .eq("id", docId);
  revalidatePath(`/studio/money/${docId}`);
}

export async function markPaid(formData: FormData) {
  await requireOwner();
  const docId = String(formData.get("docId"));
  const db = await supabaseServer();
  const { data: doc } = await db.from("finance_docs").select("kind, total").eq("id", docId).maybeSingle();
  if (doc?.kind !== "invoice") throw new Error("Only invoices can be paid");
  await db
    .from("finance_docs")
    .update({ status: "paid", amount_paid: Number(doc.total ?? 0), paid_at: new Date().toISOString() })
    .eq("id", docId);
  revalidatePath(`/studio/money/${docId}`);
}

/** Convert an approved estimate into a fresh invoice, copying its line items. */
export async function convertToInvoice(formData: FormData) {
  const actor = await requireOwner();
  const estimateId = String(formData.get("docId"));
  const db = await supabaseServer();
  const { data: est } = await db
    .from("finance_docs")
    .select("client_id, project_id, currency, tax_rate, notes, terms")
    .eq("id", estimateId)
    .maybeSingle();
  if (!est) throw new Error("Not found");

  const { data: number } = await db.rpc("finance_next_number", { p_kind: "invoice" });
  const { data: inv, error } = await db
    .from("finance_docs")
    .insert({
      kind: "invoice",
      number: (number as string) ?? "INV-0000",
      client_id: est.client_id,
      project_id: est.project_id,
      currency: est.currency,
      tax_rate: est.tax_rate,
      notes: est.notes,
      terms: est.terms,
      status: "draft",
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: items } = await db
    .from("finance_line_items")
    .select("description, qty, unit_price, amount, position")
    .eq("doc_id", estimateId);
  if (items?.length) {
    await db.from("finance_line_items").insert(items.map((i) => ({ ...i, doc_id: inv.id })));
  }
  await recompute(inv.id);
  redirect(`/studio/money/${inv.id}`);
}

export async function deleteDoc(formData: FormData) {
  await requireOwner();
  const docId = String(formData.get("docId"));
  await (await supabaseServer()).from("finance_docs").delete().eq("id", docId);
  redirect("/studio/money");
}
