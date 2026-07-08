import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { listTeam } from "@/lib/team";
import { ConfirmButton } from "@/components/ConfirmButton";
import { addMember, removeMember } from "@/app/studio/team/actions";

export const dynamic = "force-dynamic";

/**
 * Team & access. Owner grants existing accounts access to a client — as
 * collaborators (outside editors) or clients (delivery only).
 */
export default async function TeamPage() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/studio/team");
  if (actor.role !== "owner") redirect("/studio");

  const team = await listTeam();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-9">
        <p className="kicker mb-2">Team &amp; access</p>
        <h1 className="display text-4xl sm:text-5xl">Who can see what</h1>
        <p className="mt-2 max-w-xl text-[14px] [color:var(--color-dim)]">
          Collaborators are your outside editors and team — they can work inside a client's projects.
          Clients only see what you publish to them.
        </p>
      </div>

      {team.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed hairline p-12 text-center text-[14px] [color:var(--color-mute)]">
          Add a client first, then bring people in.
        </p>
      ) : (
        <div className="space-y-8">
          {team.map((c) => (
            <section key={c.clientId} className="card p-5">
              <h2 className="kicker mb-3 border-b hairline pb-2">{c.clientName}</h2>

              {c.members.length === 0 ? (
                <p className="mb-4 text-[13px] [color:var(--color-mute)]">No one added yet.</p>
              ) : (
                <ul className="mb-4 space-y-1.5">
                  {c.members.map((m) => (
                    <li key={m.membershipId} className="flex items-center gap-3 text-[13.5px]">
                      <span className="min-w-0 flex-1 truncate">{m.fullName || m.email || m.userId}</span>
                      <span className="chip capitalize">{m.role}</span>
                      <form action={removeMember}>
                        <input type="hidden" name="membershipId" value={m.membershipId} />
                        <ConfirmButton message="Remove this person's access?" className="text-[12px] [color:var(--color-mute)] hover:[color:var(--color-danger)]">Remove</ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <form action={addMember} className="flex flex-wrap items-center gap-2 border-t hairline pt-4">
                <input type="hidden" name="clientId" value={c.clientId} />
                <input name="email" type="email" required placeholder="person@email.com" className="field !h-9 min-w-48 flex-1 text-[13px]" />
                <select name="role" className="field !h-9 !w-auto text-[13px]">
                  <option value="collaborator">Collaborator</option>
                  <option value="client">Client</option>
                </select>
                <button className="btn btn-ghost btn-sm">Add</button>
              </form>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-[12px] [color:var(--color-faint)]">
        People must have signed up at collab.isaacpoole.co before you can add them. Email invites for brand-new collaborators are a follow-up.
      </p>
    </div>
  );
}
