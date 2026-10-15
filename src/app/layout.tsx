import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Source_Sans_3 } from "next/font/google";
import { getHeaderSettings, getSettings, mediaItems } from "@/lib/cms/queries";
import { siteOrigin } from "@/lib/paths";
import { noIndexRobots } from "@/lib/seo-robots";
import { NavigationFeedback } from "@/components/site/navigation-feedback";
import { mediaDeliveryUrl } from "@/lib/media-url";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

export const revalidate = 120;

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [settings, header] = await Promise.all([
      getSettings(),
      getHeaderSettings(),
    ]);
    const faviconId = header.faviconId || settings.faviconId;
    const favicon = faviconId ? (await mediaItems([faviconId]))[0] : null;
    const faviconUrl = favicon
      ? mediaDeliveryUrl(favicon)
      : "/brand/favicon.png";

    return {
      metadataBase: new URL(siteOrigin()),
      title: {
        default: settings.companyName,
        template: `%s · ${settings.companyName}`,
      },
      description: settings.footerText,
      icons: {
        icon: [{ url: faviconUrl, type: favicon?.mimeType || "image/png" }],
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
      authors: [{ name: settings.companyName, url: siteOrigin() }],
      openGraph: {
        type: "website",
        siteName: settings.companyName,
        url: siteOrigin(),
      },
      robots: noIndexRobots,
    };
  } catch {
    return {
      metadataBase: new URL(siteOrigin()),
      title: {
        default: "Jyoti Hydraulic",
        template: "%s · Jyoti Hydraulic",
      },
      description:
        "Hydraulic machines and power packs manufactured in Faridabad, India.",
      icons: {
        icon: [
          { url: "/brand/favicon.png", type: "image/png", sizes: "1024x1024" },
        ],
        shortcut: "/brand/favicon.png",
        apple: "/brand/favicon.png",
      },
      robots: noIndexRobots,
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <head>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </head>
      <body className="min-h-full">
        <Suspense fallback={null}>
          <NavigationFeedback />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
