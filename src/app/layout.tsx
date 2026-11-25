import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Source_Sans_3 } from "next/font/google";
import { getDb } from "@/db";
import { pageHtmlOverrides, siteHtmlSettings } from "@/db/schema-cms";
import { productCategories } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getHeaderSettings, getSettings, mediaItems } from "@/lib/cms/queries";
import { siteOrigin } from "@/lib/paths";
import { NavigationFeedback } from "@/components/site/navigation-feedback";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { PwaServiceWorker } from "@/components/site/pwa-service-worker";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

export const revalidate = 120;

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

function normalizePath(value: string) {
  const pathname = value.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return pathname || "/";
}

async function requestPathname() {
  const requestHeaders = await headers();
  const candidates = [
    requestHeaders.get("x-site-pathname"),
    requestHeaders.get("x-invoke-path"),
    requestHeaders.get("next-url"),
    requestHeaders.get("x-forwarded-uri"),
    requestHeaders.get("x-original-url"),
  ];
  for (const candidate of candidates) {
    if (candidate?.startsWith("/") && !candidate.includes("[")) {
      return normalizePath(candidate);
    }
  }
  return "/";
}

async function publicHeadHtml() {
  try {
    const pathname = await requestPathname();
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return "";
    const db = getDb();
    const [settings, override, category] = await Promise.all([
      db
        .select({ commonHeaderHtml: siteHtmlSettings.commonHeaderHtml })
        .from(siteHtmlSettings)
        .where(eq(siteHtmlSettings.id, "default"))
        .limit(1),
      db
        .select({ path: pageHtmlOverrides.path, headerHtml: pageHtmlOverrides.headerHtml })
        .from(pageHtmlOverrides)
        .where(eq(pageHtmlOverrides.isActive, true)),
      db.select({ type: sql<string | null>`${productCategories.listingConfig} #>> '{liveMeta,og:type}'` }).from(productCategories)
        .where(and(eq(productCategories.path, pathname.slice(1)), eq(productCategories.status, "published"))).limit(1),
    ]);
    const matchingOverride = override.find(
      (item) => normalizePath(item.path) === pathname,
    );
    // Next metadata rejects the WordPress OG type "product". Emit the validated type in the actual head.
    const type = category[0]?.type;
    const categoryType = type && /^[a-z][a-z0-9._:-]*$/i.test(type)
      ? `<meta data-category-og-type="" property="og:type" content="${type}">` : "";
    return [settings[0]?.commonHeaderHtml, matchingOverride?.headerHtml, categoryType]
      .filter((value): value is string => Boolean(value?.trim()))
      .join("\n");
  } catch {
    return "";
  }
}

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
        default: settings.companyName || "Jyoti Hydraulic",
        // Keep page SEO titles exact (match live WordPress). Child routes set
        // absolute titles; this default is only a fallback.
        template: "%s",
      },
      description:
        settings.shortDescription ||
        settings.footerText ||
        "Jyoti Hydraulic is a leading hydraulic machine manufacturer in Faridabad, India.",
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
    };
  } catch {
    return {
      metadataBase: new URL(siteOrigin()),
      title: {
        default: "Jyoti Hydraulic",
        template: "%s",
      },
      description:
        "Jyoti Hydraulic is a leading hydraulic machine manufacturer in Faridabad, India, offering hydraulic cylinders, power packs and industrial solutions.",
      icons: {
        icon: [
          { url: "/brand/favicon.png", type: "image/png", sizes: "1024x1024" },
        ],
        shortcut: "/brand/favicon.png",
        apple: "/brand/favicon.png",
      },
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headHtmlPromise = publicHeadHtml();
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <RootHead htmlPromise={headHtmlPromise} />
      <body className="min-h-full">
        <PwaServiceWorker />
        <Suspense fallback={null}>
          <NavigationFeedback />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

async function RootHead({ htmlPromise }: { htmlPromise: Promise<string> }) {
  const html = await htmlPromise;
  return (
    <head suppressHydrationWarning
      dangerouslySetInnerHTML={{
        // HTML parser normalizes void tags in <head>; omit XHTML-style
        // self-closing syntax so the server string matches the hydrated DOM.
        __html: `<meta http-equiv="X-UA-Compatible" content="IE=edge">${html}`,
      }}
    />
  );
}
