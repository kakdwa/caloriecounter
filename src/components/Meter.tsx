export function Meter({ value, max, big }: { value: number; max: number; big?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`meter ${big ? "big" : ""}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function MacroTile({ name, value, goal }: { name: string; value: number; goal: number }) {
  return (
    <div className="stack gap-8">
      <div className="eyebrow">{name}</div>
      <div className="macro-val">
        <b>{Math.round(value)}</b>
        <span>/ {goal} g</span>
      </div>
      <Meter value={value} max={goal} />
    </div>
  );
}
