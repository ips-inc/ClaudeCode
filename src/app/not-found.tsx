import Link from "next/link";

/** Friendly 404 — a mistyped link or something that was moved or revoked. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="kicker">404</p>
      <h1 className="display text-4xl sm:text-5xl">Nothing lives here.</h1>
      <p className="max-w-md text-[14px] [color:var(--color-dim)]">
        The link may have been mistyped, moved, or taken down. If someone sent
        it to you, ask them for a fresh one.
      </p>
      <Link href="/" className="btn btn-ghost">Go home</Link>
    </main>
  );
}
