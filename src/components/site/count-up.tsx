"use client";

import { useEffect, useRef, useState } from "react";

function parseCount(value: string) {
  const match = value.trim().match(/^(\d+)(.*)$/);
  if (!match) return null;
  return { target: Number(match[1]), suffix: match[2] };
}

function formatCount(target: number, suffix: string, pad: number) {
  return `${String(target).padStart(pad, "0")}${suffix}`;
}

export function CountUp({
  value,
  pad = 0,
  as: Tag = "span",
}: {
  value: string;
  pad?: number;
  as?: "span" | "strong";
}) {
  const ref = useRef<HTMLElement>(null);
  const parsed = parseCount(value);
  const target = parsed?.target;
  const suffix = parsed?.suffix;
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    if (target === undefined || suffix === undefined || !ref.current) return;
    const node = ref.current;
    let frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = () => {
      if (reduced) return;
      setCurrent(0);
      const duration = target > 100 ? 1600 : 1100;
      const begun = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - begun) / duration);
        const eased = 1 - (1 - progress) ** 3;
        setCurrent(Math.round(target * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        start();
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, suffix]);

  const text =
    current === null || !parsed
      ? parsed
        ? formatCount(parsed.target, parsed.suffix, pad)
        : value
      : formatCount(current, parsed.suffix, pad);

  return Tag === "strong" ? <strong ref={ref}>{text}</strong> : <span ref={ref}>{text}</span>;
}
