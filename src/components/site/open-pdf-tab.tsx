"use client";

import { useEffect, useRef } from "react";

/** Opens a PDF URL in a new browser tab once when the catalogue page loads. */
export function OpenPdfInNewTab({ url }: { url: string }) {
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || !url) return;
    opened.current = true;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  return null;
}
