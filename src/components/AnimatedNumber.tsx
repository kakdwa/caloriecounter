import { useEffect, useRef, useState } from "react";

/** Interpolate from the last visible value, including interrupted updates. */
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const current = useRef(value);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) { current.current = value; setShown(value); return; }
    const from = current.current, start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 650);
      current.current = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const format = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  return <><span aria-hidden="true">{format(shown)}</span><span className="sr-only">{format(value)}</span></>;
}
