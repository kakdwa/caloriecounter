import { useId, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
export { gsap, useGSAP };

/** Press feedback belongs to the control, and never delays its action. */
export function PressFeedback() {
  const reduced = useMotionPreference();
  useGSAP((_context, contextSafe) => {
    const root = document.getElementById("root");
    if (!root) return;
    let pressed: HTMLElement | null = null;
    let origin: { x: number; y: number } | null = null;
    const release = contextSafe!(() => {
      if (pressed) gsap.to(pressed, { "--press-scale": 1, duration: reduced ? 0 : .3, ease: "back.out(1.5)", overwrite: true });
      pressed = null;
      origin = null;
    });
    const press = contextSafe!((target: EventTarget | null) => {
      release();
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>("button, .check-control");
      if (!control || !root.contains(control) || control.matches(":disabled, .is-disabled") || control.closest("[inert]")) return;
      pressed = control;
      gsap.set(control, { "--press-scale": reduced ? 1 : control.offsetWidth > 160 ? .985 : .94 });
    });
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      press(event.target);
      origin = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12) release();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (!event.repeat && (event.key === " " || event.key === "Enter")) press(event.target);
    };
    const keyUp = (event: KeyboardEvent) => { if (event.key === " " || event.key === "Enter") release(); };
    root.addEventListener("pointerdown", down, true);
    root.addEventListener("keydown", keyDown, true);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    document.addEventListener("keyup", keyUp);
    window.addEventListener("blur", release);
    return () => {
      root.removeEventListener("pointerdown", down, true);
      root.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
      document.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", release);
    };
  }, { dependencies: [reduced], revertOnUpdate: true });
  return null;
}

/** Animate a container's real content height, including asynchronous content changes. */
export function AutoHeight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  useGSAP((_context, contextSafe) => {
    const measure = () => inner.current!.getBoundingClientRect().height;
    gsap.set(outer.current, { height: measure() });
    const observer = new ResizeObserver(contextSafe!(() => {
      gsap.to(outer.current, { height: measure(), duration: reduced ? 0 : .3, ease: "power3.out", overwrite: true });
    }));
    observer.observe(inner.current!);
    return () => observer.disconnect();
  }, { scope: outer, dependencies: [reduced], revertOnUpdate: true });
  return <div ref={outer} className={`auto-height ${className}`}><div ref={inner} className="auto-height-content">{children}</div></div>;
}

/** Keep content mounted through its exit; reopening reverses from the current position. */
export function Presence({ show, children, className = "" }: { show: boolean; children: ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(show);
  const outer = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null);
  const cached = useRef(children);
  const reduced = useMotionPreference();
  if (show) cached.current = children;
  if (show && !mounted) setMounted(true);
  useGSAP(() => {
    if (!outer.current) return;
    if (show) {
      if (!outer.current.style.height) gsap.set(outer.current, { height: 0, opacity: 0, y: 8 });
      gsap.to(outer.current, { height: "auto", opacity: 1, y: 0, duration: reduced ? 0 : .28, ease: "power3.out", overwrite: true });
    } else {
      gsap.to(outer.current, { height: 0, opacity: 0, y: reduced ? 0 : 6, duration: reduced ? 0 : .18, ease: "power2.in", overwrite: true, onComplete: () => setMounted(false) });
    }
  }, { scope: outer, dependencies: [show, mounted, reduced] });
  return mounted ? <div ref={outer} className={`motion-presence ${className}`} inert={!show} aria-hidden={!show}><div ref={inner}><AutoHeight>{show ? children : cached.current}</AutoHeight></div></div> : null;
}

/** A settings pane changes in place; the persistent header and controls never move. */
export function SwitchPanel({ active, children }: { active: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  useGSAP(() => {
    if (active) gsap.fromTo(ref.current, { opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }, { opacity: 1, y: 0, duration: reduced ? 0 : .24, ease: "power2.out", clearProps: "transform,opacity" });
  }, { scope: ref, dependencies: [active, reduced], revertOnUpdate: true });
  return <div ref={ref} hidden={!active}>{children}</div>;
}

/** Keep final states intact when the OS motion preference changes mid-animation. */
export function useMotionPreference() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // useGSAP supplies lifecycle cleanup for the same scope as the animations.
  useGSAP(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** A data update moves the fill; first render shows its true value immediately. */
export function MeterFill({ ratio }: { ratio: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const value = Math.max(0, Math.min(1, ratio));
  const initial = useRef(value);
  const first = useRef(true);
  const reduced = useMotionPreference();
  useGSAP(() => {
    gsap.to(ref.current, {
      scaleX: value,
      duration: first.current || reduced ? 0 : 0.42,
      ease: "power2.out",
      overwrite: true,
    });
    first.current = false;
  }, { scope: ref, dependencies: [value, reduced] });
  return <span ref={ref} className="meter-fill" style={{ transform: `scaleX(${initial.current})` }} />;
}

export function Disclosure({
  title,
  children,
  className = "",
  defaultOpen = false,
  label,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const region = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const first = useRef(true);
  const id = useId();
  const reduced = useMotionPreference();
  useGSAP(
    () => {
      const node = region.current!;
      const immediate = first.current || reduced;
      first.current = false;
      if (!open && node.contains(document.activeElement))
        button.current?.focus();
      gsap.to(node, {
        height: open ? "auto" : 0,
        opacity: open ? 1 : 0,
        duration: immediate ? 0 : open ? 0.28 : 0.2,
        ease: "power2.inOut",
        overwrite: true,
      });
    },
    { dependencies: [open, reduced], scope: region },
  );
  return (
    <div className={`disclosure ${className} ${open ? "is-open" : ""}`}>
      <button
        ref={button}
        className="disclosure-trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="disclosure-title">{title}</span>
        <svg
          className="disclosure-chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id={id}
        className="disclosure-region"
        ref={region}
        inert={!open}
        aria-hidden={!open}
        style={{
          height: defaultOpen ? "auto" : 0,
          opacity: defaultOpen ? 1 : 0,
        }}
      >
        <div className="disclosure-content">{children}</div>
      </div>
    </div>
  );
}

export function CheckControl({
  checked,
  onChange,
  children,
  detail,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  detail?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`check-control ${checked ? "is-checked" : ""} ${disabled ? "is-disabled" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="check-box" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path pathLength="1" d="m5 12 4 4 10-10" />
        </svg>
      </span>
      <span className="check-copy">
        <strong>{children}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </label>
  );
}

export function ViewTransition({
  children,
  view,
}: {
  children: ReactNode;
  view: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  const previous = useRef(view);
  useGSAP(
    () => {
      if (previous.current === view) return;
      previous.current = view;
      const sections = Array.from(ref.current?.children ?? []).slice(0, 5);
      gsap.fromTo(
        sections,
        { opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 },
        {
          opacity: 1,
          y: 0,
          duration: reduced ? 0 : 0.28,
          stagger: reduced ? 0 : 0.035,
          ease: "power2.out",
          clearProps: "transform,opacity",
        },
      );
    },
    { dependencies: [view, reduced], scope: ref, revertOnUpdate: true },
  );
  return (
    <div ref={ref} className="view-content">
      {children}
    </div>
  );
}
