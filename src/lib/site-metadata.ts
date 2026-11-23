import type { Metadata } from "next";
import { decodeHtmlEntities } from "@/lib/html-entities";
import { publicPath, siteOrigin } from "@/lib/paths";

export function sitePageMetadata({
  companyName,
  path,
  title,
  description,
  keywords = [],
  canonicalUrl,
}: {
  companyName: string;
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string | null;
}): Metadata {
  const cleanTitle = decodeHtmlEntities(title);
  const cleanDescription = decodeHtmlEntities(description);
  const url =
    canonicalUrl?.trim() || `${siteOrigin()}${publicPath(path)}`;
  return {
    // Absolute titles match the live WordPress SEO strings and avoid the
    // root layout appending " · CompanyName".
    title: { absolute: cleanTitle },
    description: cleanDescription,
    keywords: keywords.length ? keywords : [companyName, cleanTitle],
    alternates: { canonical: url },
    authors: [{ name: companyName, url: siteOrigin() }],
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: companyName,
      title: cleanTitle,
      description: cleanDescription,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: cleanTitle,
      description: cleanDescription,
    },
  };
}
