import { useEffect, useRef, type ReactNode, type PointerEvent } from "react";
import { gsap, useGSAP, useMotionPreference } from "./Motion";

export function Sheet({ onClose, children }: {
  onClose: () => void;
  children: (close: (afterClose?: () => void) => void) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const callback = useRef(onClose);
  callback.current = onClose;
  const reduced = useMotionPreference();
  const drag = useRef<{ id: number; start: number; y: number; time: number } | null>(null);
  const motion = useRef<gsap.core.Timeline | null>(null);
  const { contextSafe } = useGSAP(() => {
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    motion.current = gsap.timeline()
      .fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : .28 }, 0)
      .fromTo(ref.current, { x: desktop ? "110%" : 0, y: desktop ? 0 : "100%" },
        { x: 0, y: 0, duration: reduced ? 0 : .48, ease: "power3.out", clearProps: "transform" }, 0);
  }, { scope: ref, dependencies: [] });

  useEffect(() => { if (reduced) motion.current?.progress(1); }, [reduced]);

  const close = contextSafe((afterClose?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    ref.current?.setAttribute("data-closing", "true");
    motion.current?.kill();
    gsap.killTweensOf([ref.current, backdrop.current]);
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    const reduceExit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    motion.current = gsap.timeline({ onComplete: () => { callback.current(); afterClose?.(); } })
      .to(ref.current, { x: desktop ? "110%" : 0, y: desktop ? 0 : "100%", duration: reduceExit ? 0 : .28, ease: "power2.in" }, 0)
      .to(backdrop.current, { opacity: 0, duration: reduceExit ? 0 : .24, ease: "power1.in" }, 0);
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus({ preventScroll: true });
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]):not([hidden]),a[href],select,textarea,[tabindex="0"]',
      ) ?? []).filter(node => node.getClientRects().length && !node.closest("[inert],[hidden]"));
      const first = nodes[0], last = nodes.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handler);
      requestAnimationFrame(() => { if (previous?.isConnected && !previous.closest("[inert]") && (document.activeElement === document.body || !document.activeElement?.isConnected)) previous.focus({ preventScroll: true }); });
    };
  }, []);

  const release = contextSafe((cancelled = false) => {
    const gesture = drag.current;
    drag.current = null;
    if (!gesture || closing.current) return;
    const velocity = gesture.y / Math.max(1, performance.now() - gesture.time);
    if (!cancelled && (gesture.y > 100 || (gesture.y > 32 && velocity > .5))) { close(); return; }
    gsap.to(ref.current, { y: 0, duration: reduced ? 0 : .32, ease: "power3.out", clearProps: "transform", overwrite: true });
    gsap.to(backdrop.current, { opacity: 1, duration: reduced ? 0 : .24, overwrite: true });
  });

  return <>
    <div className="sheet-backdrop" ref={backdrop} onClick={() => close()} />
    <div className="sheet" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Settings and connections">
      <div className="sheet-grab" aria-hidden="true"
        onPointerDown={event => {
          if (closing.current || !event.isPrimary || event.button !== 0 || window.matchMedia("(min-width: 900px)").matches) return;
          motion.current?.progress(1);
          drag.current = { id: event.pointerId, start: event.clientY, y: 0, time: performance.now() };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={contextSafe((event: PointerEvent<HTMLDivElement>) => {
          const gesture = drag.current;
          if (!gesture || gesture.id !== event.pointerId) return;
          gesture.y = Math.max(0, event.clientY - gesture.start);
          gsap.set(ref.current, { y: gesture.y });
          gsap.set(backdrop.current, { opacity: 1 - Math.min(.6, gesture.y / Math.max(1, ref.current!.offsetHeight)) });
        })}
        onPointerUp={() => release()}
        onPointerCancel={() => release(true)}><span /></div>
      <div className="sheet-scroll">{children(close)}</div>
    </div>
  </>;
}
