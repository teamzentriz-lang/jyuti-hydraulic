
import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { getSettings } from "@/lib/cms/queries";
import { siteOrigin } from "@/lib/paths";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

export const dynamic = "force-dynamic";

const robots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettings();

    return {
      metadataBase: new URL(siteOrigin()),
      title: {
        default: settings.companyName,
        template: `%s · ${settings.companyName}`,
      },
      description: settings.footerText,
      robots,
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
      robots,
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
