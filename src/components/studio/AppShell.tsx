"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Actor } from "@/lib/authz";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** roles allowed to see this item */
  roles: Actor["role"][];
  /** treat any path under href as active */
  prefix?: boolean;
};

const NAV: NavItem[] = [
  { href: "/studio", label: "The Desk", icon: "◇", roles: ["owner", "collaborator"] },
  { href: "/studio/files", label: "Files", icon: "▧", roles: ["owner", "collaborator"], prefix: true },
  { href: "/deliver", label: "Deliver", icon: "❏", roles: ["owner", "collaborator"], prefix: true },
  { href: "/studio/money", label: "Money", icon: "$", roles: ["owner"], prefix: true },
  { href: "/studio/team", label: "Team", icon: "◎", roles: ["owner"], prefix: true },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/studio") return pathname === "/studio";
  if (item.prefix) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}

export function AppShell({
  role,
  email,
  children,
}: {
  role: Actor["role"];
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <div className="flex min-h-screen">
      {/* ── Left rail (md+) ─────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r hairline bg-[color:var(--color-surface)] md:flex">
        <div className="px-5 py-5">
          <Wordmark href="/studio" size="sm" />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {items.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[13.5px] transition-colors ${
                  active
                    ? "bg-[color:var(--color-surface-2)] font-medium [color:var(--color-ink)]"
                    : "[color:var(--color-dim)] hover:[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]"
                }`}
              >
                <span
                  className={`w-4 text-center text-[13px] ${active ? "[color:var(--color-accent)]" : "[color:var(--color-mute)]"}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t hairline px-5 py-4">
          <ThemeToggle />
          <div className="min-w-0">
            <p className="truncate text-[12px] [color:var(--color-dim)]" title={email ?? undefined}>
              {email ?? "Signed in"}
            </p>
            <div className="mt-1">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center gap-4 border-b hairline px-4 py-3 md:hidden">
          <Wordmark href="/studio" size="sm" />
          <nav className="scroll-slim -mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1">
            {items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] ${
                    active
                      ? "bg-[color:var(--color-surface-2)] font-medium [color:var(--color-ink)]"
                      : "[color:var(--color-dim)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
