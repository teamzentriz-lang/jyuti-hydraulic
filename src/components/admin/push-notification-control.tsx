"use client";

import { useEffect, useState } from "react";

type Status =
  | "loading"
  | "unsupported"
  | "available"
  | "enabled"
  | "denied"
  | "unavailable"
  | "error";

function base64ToUint8Array(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushNotificationControl({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    setStatus("available");
  }, []);

  async function enable() {
    try {
      const keyResponse = await fetch("/api/push/public-key", {
        cache: "no-store",
      });
      if (!keyResponse.ok) {
        setStatus("unavailable");
        return;
      }
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKey),
        }));
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) throw new Error("Subscription could not be saved.");
      setStatus("enabled");
    } catch {
      setStatus("error");
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  if (status === "enabled") {
    return (
      <span className="hidden items-center gap-1.5 text-xs font-semibold text-emerald-700 lg:inline-flex">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Alerts on
      </span>
    );
  }

  const label =
    status === "denied"
      ? "Notifications blocked"
      : status === "unavailable"
        ? "Alerts unavailable"
        : status === "error"
          ? "Retry notifications"
          : "Enable alerts";

  return (
    <button
      type="button"
      onClick={enable}
      disabled={status === "denied" || status === "unavailable"}
      title={label}
      className={`rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold transition ${compact ? "border-white/25 text-white hover:bg-white/10" : "text-navy hover:bg-paper"} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span aria-hidden>🔔</span>
      <span className="ml-1 hidden lg:inline">{label}</span>
    </button>
  );
}
