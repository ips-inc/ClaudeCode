import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/studio" className="flex items-baseline gap-3">
            <span className="display text-xl tracking-wide">ISAAC POOLE</span>
            <span className="microlabel">Studio</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/studio" className="microlabel hover:text-(--color-ink)">
              Projects
            </Link>
            <Link
              href="/studio/new"
              className="microlabel hover:text-(--color-ink)"
            >
              New
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
