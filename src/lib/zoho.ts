import "server-only";
import { cleanEnv } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Zoho Books sync. Entirely inert until credentials are present in the app env:
 *
 *   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID
 *   (optional) ZOHO_ACCOUNTS_DOMAIN  default https://accounts.zoho.com
 *   (optional) ZOHO_API_DOMAIN       default https://www.zohoapis.com   (.eu/.in/.au for other DCs)
 *
 * When configured, sending an estimate/invoice mirrors it into Zoho Books:
 * the client becomes a Zoho contact (cached per client) and the doc becomes a
 * Zoho estimate/invoice, whose id is stored back on our row.
 */

function env(name: string) {
  return cleanEnv(process.env[name]);
}

export function zohoConfigured(): boolean {
  return Boolean(
    env("ZOHO_CLIENT_ID") &&
      env("ZOHO_CLIENT_SECRET") &&
      env("ZOHO_REFRESH_TOKEN") &&
      env("ZOHO_ORG_ID")
  );
}

const ACCOUNTS = () => env("ZOHO_ACCOUNTS_DOMAIN") || "https://accounts.zoho.com";
const API = () => env("ZOHO_API_DOMAIN") || "https://www.zohoapis.com";
const ORG = () => env("ZOHO_ORG_ID");

async function accessToken(): Promise<string> {
  const url =
    `${ACCOUNTS()}/oauth/v2/token?refresh_token=${encodeURIComponent(env("ZOHO_REFRESH_TOKEN"))}` +
    `&client_id=${encodeURIComponent(env("ZOHO_CLIENT_ID"))}` +
    `&client_secret=${encodeURIComponent(env("ZOHO_CLIENT_SECRET"))}` +
    `&grant_type=refresh_token`;
  const res = await fetch(url, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`Zoho token failed: ${body.error ?? res.status}`);
  }
  return body.access_token as string;
}

async function zohoFetch(token: string, path: string, payload: unknown) {
  const res = await fetch(`${API()}/books/v3/${path}?organization_id=${encodeURIComponent(ORG())}`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.code && body.code !== 0)) {
    throw new Error(`Zoho ${path} failed: ${body.message ?? res.status}`);
  }
  return body;
}

/** Ensure a Zoho contact exists for the client; cache its id on our row. */
async function ensureContact(token: string, clientId: string, clientName: string): Promise<string> {
  const db = await supabaseServer();
  const { data: client } = await db
    .from("clients")
    .select("zoho_contact_id")
    .eq("id", clientId)
    .maybeSingle();
  if (client?.zoho_contact_id) return client.zoho_contact_id as string;

  const body = await zohoFetch(token, "contacts", { contact_name: clientName });
  const contactId = body.contact?.contact_id as string;
  await db.from("clients").update({ zoho_contact_id: contactId }).eq("id", clientId);
  return contactId;
}

/**
 * Push one finance doc into Zoho Books. Owner-invoked; uses the session client
 * (owner RLS). Throws on any failure so the caller can surface it.
 */
export async function syncDocToZoho(docId: string): Promise<string> {
  if (!zohoConfigured()) throw new Error("Zoho is not configured");
  const db = await supabaseServer();

  const { data: doc } = await db
    .from("finance_docs")
    .select("id, kind, number, client_id, currency, issue_date, due_date, notes, clients(name)")
    .eq("id", docId)
    .maybeSingle();
  if (!doc) throw new Error("Doc not found");
  const { data: items } = await db
    .from("finance_line_items")
    .select("description, qty, unit_price")
    .eq("doc_id", docId)
    .order("position");

  const token = await accessToken();
  const clientName = (doc.clients as { name?: string } | null)?.name ?? "Client";
  const customerId = await ensureContact(token, doc.client_id, clientName);

  const lineItems = (items ?? []).map((i) => ({
    name: i.description,
    description: i.description,
    rate: Number(i.unit_price),
    quantity: Number(i.qty),
  }));

  const isInvoice = doc.kind === "invoice";
  const payload: Record<string, unknown> = {
    customer_id: customerId,
    line_items: lineItems,
    notes: doc.notes ?? undefined,
    ...(isInvoice
      ? { invoice_number: doc.number, date: doc.issue_date, due_date: doc.due_date ?? undefined }
      : { estimate_number: doc.number, date: doc.issue_date, expiry_date: doc.due_date ?? undefined }),
  };

  const body = await zohoFetch(token, isInvoice ? "invoices" : "estimates", payload);
  const zohoId = (isInvoice ? body.invoice?.invoice_id : body.estimate?.estimate_id) as string;

  await db
    .from("finance_docs")
    .update({ zoho_id: zohoId, zoho_synced_at: new Date().toISOString() })
    .eq("id", docId);
  return zohoId;
}
