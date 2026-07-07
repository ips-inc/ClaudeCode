import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { SignOutButton } from "@/components/SignOutButton";

export function StudioHeader() {
  return (
    <header className="glass sticky top-0 z-30 border-b hairline">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-baseline gap-3">
          <Wordmark href="/studio" size="sm" />
          <span className="kicker">Studio</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/studio" className="kicker hover:[color:var(--color-ink)]">
            Projects
          </Link>
          <Link href="/studio/new" className="btn btn-sm btn-ghost">
            New
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
