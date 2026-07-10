"use client";

import Link from "next/link";

/**
 * Global error boundary — the safety net when a server action throws or a page
 * fails. Calm, on-brand, and honest: nothing the user did broke their work.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="kicker">Something went sideways</p>
      <h1 className="display text-4xl sm:text-5xl">That didn&apos;t work.</h1>
      <p className="max-w-md text-[14px] [color:var(--color-dim)]">
        Your files and work are safe — this was just the page. Try again, and if
        it keeps happening, tell Isaac what you were doing.
      </p>
      {error?.message && (
        <p className="mono max-w-md text-[12px] [color:var(--color-mute)]">{error.message}</p>
      )}
      <div className="flex items-center gap-3">
        <button onClick={reset} className="btn btn-accent">Try again</button>
        <Link href="/studio" className="btn btn-ghost">Back to the studio</Link>
      </div>
    </main>
  );
}
