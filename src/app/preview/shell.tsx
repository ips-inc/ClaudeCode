import Link from "next/link";

/** Shared chrome for demo screens — mirrors the public share-page shell. */
export function PreviewShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-(--color-ink) py-1.5 text-center">
        <p className="text-[10px] tracking-[0.2em] text-(--color-paper) uppercase">
          Design preview — demo content, not a live delivery
        </p>
      </div>
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-4">
          <Link href="/preview" className="display text-lg tracking-wide">
            ISAAC POOLE
          </Link>
          <span className="microlabel">New York City</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {(title || subtitle) && (
          <div className="mb-10 text-center">
            {subtitle && <p className="microlabel mb-3">{subtitle}</p>}
            {title && <h1 className="display text-4xl sm:text-5xl">{title}</h1>}
          </div>
        )}
        {children}
      </main>
      <footer className="border-t hairline py-6 text-center">
        <p className="microlabel">© Isaac Poole — isaacpoole.co</p>
      </footer>
    </div>
  );
}
