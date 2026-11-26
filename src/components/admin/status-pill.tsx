export function StatusPill({ value }: { value: unknown }) {
  const label = value === true ? "Active" : value === false ? "Off" : value ? String(value) : "—";
  const tone =
    value === "published" || value === true
      ? "bg-emerald-50 text-emerald-800"
      : value === "draft" || value === "new"
        ? "bg-amber-50 text-amber-800"
        : "bg-paper text-muted";

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tone}`}>{label}</span>;
}

export function formatWhen(value: unknown) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatBytes(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
