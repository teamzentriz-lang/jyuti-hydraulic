import { revalidatePath } from "next/cache";
import { publicPath } from "@/lib/paths";

/** Bust the public site shell and any specific CMS URLs after content changes. */
export function revalidatePublicSite(extraPaths: Iterable<string> = []) {
  revalidatePath("/", "layout");
  for (const path of extraPaths) {
    const clean = path.trim().replace(/^\/+|\/+$/g, "");
    if (!clean) continue;
    revalidatePath(publicPath(clean));
  }
}
