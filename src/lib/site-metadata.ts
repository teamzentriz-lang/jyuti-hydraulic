import type { Metadata } from "next";
import { publicPath, siteOrigin } from "@/lib/paths";

export function sitePageMetadata({
  companyName,
  path,
  title,
  description,
  keywords = [],
}: {
  companyName: string;
  path: string;
  title: string;
  description: string;
  keywords?: string[];
}): Metadata {
  const url = `${siteOrigin()}${publicPath(path)}`;
  return {
    title,
    description,
    keywords: keywords.length ? keywords : [companyName, title],
    alternates: { canonical: url },
    authors: [{ name: companyName, url: siteOrigin() }],
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: companyName,
      title,
      description,
      url,
    },
    twitter: { card: "summary", title, description },
  };
}
