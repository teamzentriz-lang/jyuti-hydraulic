"use client";

import { useEffect } from "react";

/** Registers offline/PWA support without requesting notification permission. */
export function PwaServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
  }, []);

  return null;
}
