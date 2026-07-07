export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Thin wrapper only — pages render their own header (login has none).
  return <div className="min-h-screen">{children}</div>;
}
