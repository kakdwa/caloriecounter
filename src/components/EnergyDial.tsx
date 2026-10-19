import { useRef } from "react";
import { gsap, useGSAP, useMotionPreference } from "./Motion";
import { n } from "../lib/format";

/** The filled sector represents logged intake, never time or a reward score. */
export function EnergyDial({ value, target }: { value: number; target: number }) {
  const sector = useRef<SVGCircleElement>(null);
  const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  const initialOffset = useRef((1 - ratio) * 100);
  const first = useRef(true);
  const reduced = useMotionPreference();
  useGSAP(() => {
    gsap.to(sector.current, {
      strokeDashoffset: (1 - ratio) * 100,
      duration: first.current || reduced ? 0 : 0.48,
      ease: "power2.out",
      overwrite: true,
    });
    first.current = false;
  }, { scope: sector, dependencies: [ratio, reduced] });

  return (
    <div className="energy-dial" role="meter" aria-label="Daily calorie intake"
      aria-valuemin={0} aria-valuemax={Math.max(value, target, 1)} aria-valuenow={value}
      aria-valuetext={`${n(value)} of ${n(target)} kilocalories`}>
      <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
        <circle cx="48" cy="48" r="44" className="energy-dial-track" />
        <circle ref={sector} cx="48" cy="48" r="22" fill="none" className="energy-dial-sector"
          strokeWidth="44" pathLength="100" strokeDasharray="100"
          strokeDashoffset={initialOffset.current} transform="rotate(-90 48 48)" />
      </svg>
    </div>
  );
}
