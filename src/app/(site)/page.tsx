import type { Metadata } from "next";
import { HomeView } from "@/components/site/home-view";
import { withBrandDefaults } from "@/lib/brand";
import { getSettings } from "@/lib/cms/queries";
import { sitePageMetadata } from "@/lib/site-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const settings = withBrandDefaults(await getSettings());
  const companyName = settings.companyName;
  const title =
    settings.siteName?.trim() ||
    "Jyoti Hydraulic | Hydraulic Machines & Power Pack Manufacturer in India";
  const description =
    settings.shortDescription?.trim() ||
    "Jyoti Hydraulic is a leading hydraulic machine manufacturer in Faridabad, India, offering hydraulic cylinders, power packs, screw jacks and industrial hydraulic solutions.";
  return sitePageMetadata({
    companyName,
    path: "/",
    title,
    description,
    canonicalUrl: "https://jyotihydraulic.com/",
    keywords: [
      companyName,
      "hydraulic machines",
      "hydraulic power pack manufacturer",
      "hydraulic cylinder manufacturer India",
    ],
  });
}

export default function HomePage() {
  return <HomeView />;
}
