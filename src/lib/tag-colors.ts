// Tag palette — shared by server and client. Kept framework-free (no imports)
// so both a server component and a "use client" component can pull it in.

export const TAG_COLORS = [
  "gray",
  "blue",
  "green",
  "amber",
  "red",
  "purple",
  "pink",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_HEX: Record<string, string> = {
  gray: "#8a8a8f",
  blue: "#0a84ff",
  green: "#30d158",
  amber: "#ffb020",
  red: "#ff453a",
  purple: "#bf5af2",
  pink: "#ff6482",
};

export function tagHex(color: string): string {
  return TAG_HEX[color] ?? TAG_HEX.gray;
}

/** Inline styles for a tag chip that read well in both light and dark. */
export function tagChipStyle(color: string) {
  const hex = tagHex(color);
  return {
    color: hex,
    borderColor: `${hex}55`,
    background: `${hex}1f`,
  } as const;
}
