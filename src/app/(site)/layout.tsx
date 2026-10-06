import { SiteShell } from "@/components/site/site-shell";
import { getSite } from "@/lib/cms/site";

export const dynamic = "force-dynamic";

export default async function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return <SiteShell site={site}>{children}</SiteShell>;
}
