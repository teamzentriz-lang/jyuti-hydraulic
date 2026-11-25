import { siteOrigin } from "./paths";

export function indexingHost() {
  if (process.env.NODE_ENV !== "production" ||
      (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")) return null;
  const host = new URL(siteOrigin()).hostname.toLowerCase();
  return host === "localhost" || host.endsWith(".vercel.app") ? null : host;
}
