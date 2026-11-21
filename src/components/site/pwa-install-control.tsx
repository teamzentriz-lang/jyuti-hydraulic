"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallControl({ compact = false }: { compact?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (installed) {
    return (
      <span className="hidden text-xs font-semibold text-emerald-700 lg:inline">
        App installed
      </span>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={install}
      className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${compact ? "border-white/25 text-white hover:bg-white/10" : "border-line text-navy hover:bg-paper"}`}
    >
      <span aria-hidden>⇩</span>
      <span className="ml-1 hidden lg:inline">Install app</span>
    </button>
  );
}
