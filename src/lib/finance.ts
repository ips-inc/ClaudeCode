import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type FinanceKind = "estimate" | "invoice";
export type FinanceStatus =
  | "draft" | "sent" | "viewed" | "approved" | "declined" | "paid" | "void";

export interface FinanceDoc {
  id: string;
  kind: FinanceKind;
  number: string;
  client_id: string;
  project_id: string | null;
  status: FinanceStatus;
  currency: string;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  tax_rate: number;
  tax: number;
  total: number;
  amount_paid: number;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  declined_at: string | null;
  paid_at: string | null;
  zoho_id: string | null;
  zoho_synced_at: string | null;
  created_at: string;
  clients?: { name: string } | null;
}

export interface LineItem {
  id: string;
  doc_id: string;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
  position: number;
}

export interface Payment {
  id: string;
  doc_id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  received_at: string;
}

export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n || 0);
}

/** An invoice that's sent/viewed, unpaid, and past its due date. */
export function isOverdue(d: FinanceDoc): boolean {
  return (
    d.kind === "invoice" &&
    (d.status === "sent" || d.status === "viewed") &&
    !!d.due_date &&
    new Date(d.due_date) < new Date()
  );
}

const DOC_COLS =
  "id, kind, number, client_id, project_id, status, currency, issue_date, due_date, notes, terms, subtotal, tax_rate, tax, total, amount_paid, sent_at, viewed_at, approved_at, declined_at, paid_at, zoho_id, zoho_synced_at, created_at, clients(name)";

export async function listDocs(kind?: FinanceKind): Promise<FinanceDoc[]> {
  const db = await supabaseServer();
  let q = db.from("finance_docs").select(DOC_COLS).order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data ?? []) as unknown as FinanceDoc[];
}

export async function getDoc(id: string): Promise<{
  doc: FinanceDoc;
  items: LineItem[];
  payments: Payment[];
} | null> {
  const db = await supabaseServer();
  const { data: doc } = await db.from("finance_docs").select(DOC_COLS).eq("id", id).maybeSingle();
  if (!doc) return null;
  const [{ data: items }, { data: payments }] = await Promise.all([
    db.from("finance_line_items").select("*").eq("doc_id", id).order("position"),
    db.from("finance_payments").select("*").eq("doc_id", id).order("received_at", { ascending: false }),
  ]);
  return {
    doc: doc as unknown as FinanceDoc,
    items: (items ?? []) as LineItem[],
    payments: (payments ?? []) as Payment[],
  };
}

export interface ArSummary {
  outstanding: number;
  overdue: number;
  awaitingApproval: number;
  paid30: number;
}

/** Accounts-receivable rollup for the Money dashboard. */
export async function arSummary(): Promise<ArSummary> {
  const docs = await listDocs();
  const now = Date.now();
  const cutoff = now - 30 * 24 * 3600 * 1000;
  let outstanding = 0, overdue = 0, awaitingApproval = 0, paid30 = 0;

  for (const d of docs) {
    const due = Number(d.total) - Number(d.amount_paid);
    if (d.kind === "invoice" && (d.status === "sent" || d.status === "viewed")) {
      outstanding += due;
      if (isOverdue(d)) overdue += due;
    }
    if (d.kind === "estimate" && (d.status === "sent" || d.status === "viewed")) {
      awaitingApproval += 1;
    }
    if (d.paid_at && new Date(d.paid_at).getTime() >= cutoff) {
      paid30 += Number(d.amount_paid);
    }
  }
  return { outstanding, overdue, awaitingApproval, paid30 };
}
