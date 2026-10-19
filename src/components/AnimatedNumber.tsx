import { useRef } from "react";
import { gsap, useGSAP, useMotionPreference } from "./Motion";

/** Interpolate from the last visible value, including interrupted updates. */
export function AnimatedNumber({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const current = useRef({ value });
  const node = useRef<HTMLSpanElement>(null);
  const reduced = useMotionPreference();
  const format = (n: number) =>
    n.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
  useGSAP(
    () => {
      gsap.to(current.current, {
        value,
        duration: reduced ? 0 : 0.42,
        ease: "power2.out",
        overwrite: true,
        onUpdate: () => {
          if (node.current)
            node.current.textContent = format(current.current.value);
        },
      });
    },
    { dependencies: [value, decimals, reduced], scope: node },
  );
  return (
    <>
      <span ref={node} aria-hidden="true">
        {format(current.current.value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
