import { revalidatePath } from "next/cache";
import { publicPath } from "@/lib/paths";

/** Bust the public site shell and any specific CMS URLs after content changes. */
export function revalidatePublicSite(extraPaths: Iterable<string> = []) {
  // Import scripts run outside a Next.js request/static-generation context.
  // Calling revalidatePath there can hang after all database writes have
  // completed, leaving operators with a misleading incomplete import.
  if (!process.env.NEXT_RUNTIME) {
    console.log("Skipped cache revalidation outside Next.js; redeploy or restart to publish imported content.");
    return;
  }

  try {
    const paths = [...extraPaths];
    if (!paths.length) revalidatePath("/", "layout");
    for (const path of paths) {
      const clean = path.trim().replace(/^\/+|\/+$/g, "");
      if (!clean) continue;
      revalidatePath(publicPath(clean), "page");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/static generation store missing/i.test(message)) {
      console.warn("Skipped cache revalidation (run inside Next.js or restart dev server to see changes).");
      return;
    }
    throw error;
  }
}
