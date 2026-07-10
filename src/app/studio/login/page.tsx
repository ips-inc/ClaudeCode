"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Wordmark } from "@/components/brand/Wordmark";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) {
      // Surface real detail — status + name + message — so failures are legible.
      const e = error as { message?: string; name?: string; status?: number };
      const detail =
        [e.name, e.status ? `(${e.status})` : "", e.message].filter(Boolean).join(" ").trim();
      setError(detail || "Sign-in failed — check your connection and try again.");
      console.error("[login] sign-in error:", error);
      setBusy(false);
      return;
    }
    router.replace(params.get("next") || "/studio");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[320px] space-y-3">
      <label className="block space-y-1.5">
        <span className="kicker">Email</span>
        <input
          className="field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label className="block space-y-1.5">
        <span className="kicker">Password</span>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p className="text-[13px] [color:var(--color-danger)]">{error}</p>
      )}
      <button className="btn btn-accent w-full" disabled={busy}>
        {busy ? "Signing in…" : "Enter studio"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, rgba(10,132,255,0.16), transparent)" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <Wordmark href={null as unknown as string} size="lg" />
        <p className="kicker mt-3">Studio</p>
      </div>
      <div className="relative z-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      {/* A stranded visitor needs a way out and a way forward. */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <p className="max-w-xs text-[12.5px] [color:var(--color-mute)]">
          Accounts are invite-only. If Isaac sent you a delivery or review link,
          open that link directly — no sign-in needed.
        </p>
        <a href="/" className="kicker hover:[color:var(--color-ink)]">← Back to isaacpoole.co</a>
      </div>
    </main>
  );
}
