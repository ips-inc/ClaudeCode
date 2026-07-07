import Link from "next/link";

/**
 * The ISAAC POOLE wordmark — editorial serif, wide tracking, echoing the logo.
 * `sub` prints a secondary line (e.g. STUDIO / a product area).
 */
export function Wordmark({
  href = "/",
  size = "md",
  sub,
  className = "",
}: {
  href?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  sub?: string;
  className?: string;
}) {
  const scale = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-3xl",
    xl: "text-5xl sm:text-6xl",
  }[size];

  const inner = (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={`wordmark ${scale} leading-none`}>ISAAC POOLE</span>
      {sub && <span className="kicker mt-2 self-start pl-[0.34em]">{sub}</span>}
    </span>
  );

  return href ? (
    <Link href={href} className="inline-block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
