export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-signal">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  const className =
    tone === "ok"
      ? "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      : "mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800";
  return <p className={className}>{children}</p>;
}
