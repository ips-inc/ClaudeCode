import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Ambient light — a single soft glow, Apple keynote restraint */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-20%] h-[70vh] w-[90vw] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(10,132,255,0.18), rgba(255,255,255,0.04) 60%, transparent)",
        }}
      />

      <header className="glass sticky top-0 z-20 border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark href="/" size="sm" />
          <Link href="/studio" className="btn btn-sm btn-ghost">
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <p className="kicker">New York City — Editorial &amp; Commercial</p>
        <h1 className="display text-5xl sm:text-7xl">
          The studio,
          <br />
          delivered.
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-dim [color:var(--color-dim)]">
          Private galleries, frame-accurate review, and secure delivery — one
          quiet place for the work between Isaac and the people he makes it with.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/studio" className="btn btn-accent">
            Enter studio
          </Link>
          <a
            href="https://www.isaacpoole.co"
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            View portfolio
          </a>
        </div>
        <p className="kicker mt-4 [color:var(--color-faint)]">
          Received a link? Open it directly — everything is on that page.
        </p>
      </section>

      <footer className="relative z-10 border-t hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <span className="kicker">© Isaac Poole</span>
          <div className="flex gap-6">
            <a className="kicker hover:[color:var(--color-ink)]" href="https://www.isaacpoole.co" target="_blank" rel="noreferrer">Portfolio</a>
            <a className="kicker hover:[color:var(--color-ink)]" href="https://models.isaacpoole.co" target="_blank" rel="noreferrer">Models</a>
            <a className="kicker hover:[color:var(--color-ink)]" href="https://collab.isaacpoole.co" target="_blank" rel="noreferrer">Collab</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
