import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export interface TeamMember {
  membershipId: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  role: "collaborator" | "client";
}

export interface ClientTeam {
  clientId: string;
  clientName: string;
  members: TeamMember[];
}

/** Every client with its members (owner-only view; RLS gates it). */
export async function listTeam(): Promise<ClientTeam[]> {
  const db = await supabaseServer();
  const [{ data: clients }, { data: memberships }] = await Promise.all([
    db.from("clients").select("id, name").is("archived_at", null).order("name"),
    db.from("memberships").select("id, user_id, role, client_id, profiles(email, full_name)"),
  ]);

  const byClient = new Map<string, TeamMember[]>();
  for (const m of (memberships ?? []) as unknown as {
    id: string;
    user_id: string;
    role: "collaborator" | "client";
    client_id: string;
    profiles: { email: string | null; full_name: string | null } | null;
  }[]) {
    const arr = byClient.get(m.client_id) ?? [];
    arr.push({
      membershipId: m.id,
      userId: m.user_id,
      email: m.profiles?.email ?? null,
      fullName: m.profiles?.full_name ?? null,
      role: m.role,
    });
    byClient.set(m.client_id, arr);
  }

  return (clients ?? []).map((c) => ({
    clientId: c.id,
    clientName: c.name,
    members: byClient.get(c.id) ?? [],
  }));
}
