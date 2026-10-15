import type { Metadata } from "next";
import { HomeView } from "@/components/site/home-view";
import { getHome, getSettings } from "@/lib/cms/queries";
import { sitePageMetadata } from "@/lib/site-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, home] = await Promise.all([getSettings(), getHome()]);
  return sitePageMetadata({
    companyName: settings.companyName,
    path: "/",
    title: home.heroHeadline || settings.companyName,
    description: home.heroSubcopy || settings.footerText,
    keywords: [
      settings.companyName,
      "hydraulic solutions",
      "hydraulic manufacturer",
    ],
  });
}

export default function HomePage() {
  return <HomeView />;
}
