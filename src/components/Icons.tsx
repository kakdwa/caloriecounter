const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
      <path d="M4 19V11" /><path d="M10 19V5" /><path d="M16 19v-8" /><path d="M22 19H2" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} strokeWidth={2.25} style={{ color: "var(--accent)" }}>
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
      <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg width="80" height="12" viewBox="0 0 80 12" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 6h74" /><path d="M72 2l4 4-4 4" />
    </svg>
  );
}
