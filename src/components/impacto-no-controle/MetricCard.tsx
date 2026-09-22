export function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm font-bold text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-[var(--brand-dark)]">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}
