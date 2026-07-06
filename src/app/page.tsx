import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center">
      <div>
        <p className="microlabel mb-4">New York City</p>
        <h1 className="display text-5xl sm:text-6xl">ISAAC POOLE</h1>
        <p className="microlabel mt-4">Studio — Client Delivery</p>
      </div>
      <div className="h-px w-16 bg-(--color-hairline)" />
      <p className="max-w-sm text-sm leading-relaxed text-(--color-stone)">
        Galleries, review links, and file transfers land here. If you received a
        link from Isaac, open it directly — everything you need is on that page.
      </p>
      <Link href="/studio" className="btn-ghost">
        Studio sign in
      </Link>
    </main>
  );
}
