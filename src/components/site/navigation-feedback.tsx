"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  const target = new URL(anchor.href, window.location.href);
  return target.origin === window.location.origin && target.href !== window.location.href;
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const [loading, setLoading] = useState(false);
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    const completionTimer = window.setTimeout(() => {
      setLoading(false);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    }, 0);
    return () => window.clearTimeout(completionTimer);
  }, [locationKey]);

  useEffect(() => {
    const start = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement) || !isInternalNavigation(event, anchor)) return;
      setLoading(true);
      document.documentElement.classList.add("is-navigating");
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = window.setTimeout(() => setLoading(false), 12000);
    };
    document.addEventListener("click", start, true);
    return () => {
      document.removeEventListener("click", start, true);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!loading) document.documentElement.classList.remove("is-navigating");
  }, [loading]);

  return loading ? (
    <div className="navigation-feedback" role="progressbar" aria-label="Loading page">
      <span />
    </div>
  ) : null;
}
