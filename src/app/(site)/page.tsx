import type { Metadata } from "next";
import { HomeView } from "@/components/site/home-view";
import { getHome, getSettings } from "@/lib/cms/queries";
import { siteOrigin } from "@/lib/paths";
import { noIndexRobots } from "@/lib/seo-robots";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, home] = await Promise.all([getSettings(), getHome()]);
  return {
    title: home.heroHeadline || settings.companyName,
    description: home.heroSubcopy || settings.footerText,
    alternates: { canonical: `${siteOrigin()}/` },
    robots: noIndexRobots,
  };
}

export default function HomePage() {
  return <HomeView />;
}
