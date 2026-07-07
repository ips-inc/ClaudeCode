import { getActor } from "@/lib/authz";
import { AppShell } from "@/components/studio/AppShell";

export const dynamic = "force-dynamic";

export default async function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const actor = await getActor();

  // Unauthenticated routes under /studio (the login page) render bare — the
  // shell only wraps a signed-in session. Protected pages redirect to login
  // themselves when there's no actor, so this never hides a guard.
  if (!actor || actor.role === "client") {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <AppShell role={actor.role} email={actor.email}>
      {children}
    </AppShell>
  );
}
