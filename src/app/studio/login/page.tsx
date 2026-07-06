"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

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
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace(params.get("next") || "/studio");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <label className="block space-y-1.5">
        <span className="microlabel">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label className="block space-y-1.5">
        <span className="microlabel">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
      <button className="btn w-full" disabled={busy}>
        {busy ? "Signing in…" : "Enter Studio"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <h1 className="display text-4xl">ISAAC POOLE</h1>
        <p className="microlabel mt-3">Studio</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
