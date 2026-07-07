import Link from "next/link";

/**
 * The ISAAC POOLE wordmark.
 *
 * By default this renders the name in the editorial serif (theme-aware, sharp
 * at any size). To use the real logo file instead, drop it at
 * `public/brand/isaac.svg` (or .png) and set `NEXT_PUBLIC_LOGO_SRC=/brand/isaac.svg`
 * — it then renders that asset everywhere the wordmark appears.
 */
const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_SRC;

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

  const imgHeight = { sm: 18, md: 24, lg: 40, xl: 72 }[size];

  const inner = (
    <span className={`inline-flex flex-col ${className}`}>
      {LOGO_SRC ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_SRC}
          alt="Isaac Poole"
          style={{ height: imgHeight, width: "auto" }}
          // invert the black logo to white on dark surfaces; light surfaces reset it
          className="select-none [filter:invert(1)] [.surface-light_&]:[filter:none]"
        />
      ) : (
        <span className={`wordmark ${scale} leading-none`}>ISAAC POOLE</span>
      )}
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
