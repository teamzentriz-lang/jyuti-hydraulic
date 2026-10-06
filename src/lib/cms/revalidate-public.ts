import { revalidatePath } from "next/cache";
import { publicPath } from "@/lib/paths";

/** Bust the public site shell and any specific CMS URLs after content changes. */
export function revalidatePublicSite(extraPaths: Iterable<string> = []) {
  try {
    revalidatePath("/", "layout");
    for (const path of extraPaths) {
      const clean = path.trim().replace(/^\/+|\/+$/g, "");
      if (!clean) continue;
      revalidatePath(publicPath(clean));
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
