"use client";

import { useEffect, useRef, useState } from "react";

type Rgba = { r: number; g: number; b: number; a: number };

function parseRgba(value: string | null | undefined): Rgba | null {
  if (!value) return null;
  const match = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?/);
  if (!match) return null;
  const alpha = match[4]
    ? match[4].endsWith("%")
      ? Number.parseFloat(match[4]) / 100
      : Number(match[4])
    : 1;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
}

function isNavy(color: Rgba | null) {
  if (!color || color.a < 0.45) return false;
  const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  return luminance < 0.55 && color.b > color.r + 8 && color.b >= color.g - 5;
}

function gradientAt(backgroundImage: string, el: Element, x: number, y: number): Rgba | null {
  if (!backgroundImage.includes("gradient")) return null;
  const rect = el.getBoundingClientRect();
  const relX = rect.width ? (x - rect.left) / rect.width : 0.5;
  const relY = rect.height ? (y - rect.top) / rect.height : 0.5;
  const angle = /linear-gradient\(\s*([\d.]+)deg/.exec(backgroundImage);
  let t = relX;
  if (angle) {
    const degrees = Number(angle[1]);
    const dx = Math.sin((degrees * Math.PI) / 180);
    const dy = -Math.cos((degrees * Math.PI) / 180);
    const raw = relX * dx + relY * dy;
    const min = Math.min(0, dx, dy, dx + dy);
    const max = Math.max(0, dx, dy, dx + dy);
    t = max === min ? 0.5 : (raw - min) / (max - min);
  }
  const found = [...backgroundImage.matchAll(/(rgba?\([^)]+\))\s*(\d+(?:\.\d+)?%)?/g)];
  const stops = found.flatMap((match, index) => {
    const color = parseRgba(match[1]);
    if (!color) return [];
    const pos = match[2] ? Number.parseFloat(match[2]) / 100 : index / Math.max(found.length - 1, 1);
    return [{ ...color, pos }];
  });
  if (!stops.length) return null;
  let start = stops[0];
  let end = stops[stops.length - 1];
  for (let index = 0; index < stops.length - 1; index += 1) {
    if (t >= stops[index].pos && t <= stops[index + 1].pos) {
      start = stops[index];
      end = stops[index + 1];
      break;
    }
  }
  const span = end.pos - start.pos || 1;
  const mix = Math.min(1, Math.max(0, (t - start.pos) / span));
  return {
    r: start.r + (end.r - start.r) * mix,
    g: start.g + (end.g - start.g) * mix,
    b: start.b + (end.b - start.b) * mix,
    a: start.a + (end.a - start.a) * mix,
  };
}

function pseudoCovers(style: CSSStyleDeclaration, el: Element, x: number, y: number) {
  if (style.position !== "absolute" && style.position !== "fixed") return true;
  const rect = el.getBoundingClientRect();
  const top = style.top === "auto" ? Number.NaN : Number.parseFloat(style.top);
  const left = style.left === "auto" ? Number.NaN : Number.parseFloat(style.left);
  const width = Number.parseFloat(style.width);
  const height = Number.parseFloat(style.height);
  const boxLeft = Number.isNaN(left) ? rect.left : rect.left + left;
  const boxTop = Number.isNaN(top) ? rect.top : rect.top + top;
  const boxWidth = Number.isNaN(width) ? rect.width : width;
  const boxHeight = Number.isNaN(height) ? rect.height : height;
  return x >= boxLeft && x <= boxLeft + boxWidth && y >= boxTop && y <= boxTop + boxHeight;
}

function photoCovers(el: Element, x: number, y: number) {
  const image = getComputedStyle(el).backgroundImage;
  if (/url\(/.test(image) && !image.includes("gradient")) return true;
  for (const img of el.querySelectorAll("img")) {
    const rect = img.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
  }
  return false;
}

function surfaceAt(el: Element, x: number, y: number): boolean | null {
  const layers = [getComputedStyle(el), getComputedStyle(el, "::after"), getComputedStyle(el, "::before")];
  for (const style of layers) {
    if (style !== layers[0]) {
      if (style.content === "none" || style.content === "normal") continue;
      if (!pseudoCovers(style, el, x, y)) continue;
    }
    const gradient = gradientAt(style.backgroundImage, el, x, y);
    if (gradient && gradient.a >= 0.45) return isNavy(gradient);
    if (style === layers[0] && photoCovers(el, x, y)) return false;
    const solid = parseRgba(style.backgroundColor);
    if (solid && solid.a >= 0.45) return isNavy(solid);
  }
  return null;
}

function surfaceIsNavy(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 8, Math.max(8, rect.left + rect.width / 2));
  const y = Math.min(window.innerHeight - 8, Math.max(8, rect.top + rect.height / 2));
  const previous = node.style.visibility;
  node.style.visibility = "hidden";
  let el = document.elementFromPoint(x, y);
  node.style.visibility = previous;

  while (el && el !== document.documentElement) {
    const hit = surfaceAt(el, x, y);
    if (hit !== null) return hit;
    el = el.parentElement;
  }
  return false;
}

export function WhatsAppFloat({ href }: { href: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [onDark, setOnDark] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    let frame = 0;
    const check = () => {
      const next = surfaceIsNavy(node);
      setOnDark((current) => (current === next ? current : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={rootRef} className={onDark ? "float-actions is-on-dark" : "float-actions"}>
      <a
        className="float-actions__whatsapp"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.76 13.9c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.63-.6-2.87-1.24-4.74-4.13-4.88-4.32-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.24-.25.64-.36.85-.36h.61c.2 0 .46-.07.72.55.27.64.91 2.22.99 2.38.08.16.13.35.03.56-.1.21-.15.34-.3.52-.15.18-.31.4-.45.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.96.3.15.5.22.57.34.08.13.08.74-.16 1.42Z" />
        </svg>
        <span>WhatsApp</span>
      </a>
    </div>
  );
}
