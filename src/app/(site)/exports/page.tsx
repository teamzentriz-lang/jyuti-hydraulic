import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { exportPages } from "@/db/schema";
import { getSettings } from "@/lib/cms/queries";
import { publicPath } from "@/lib/paths";
import { sitePageMetadata } from "@/lib/site-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return sitePageMetadata({
    companyName: settings.companyName,
    path: "exports",
    title: "Export Markets",
    description:
      "Explore Jyoti Hydraulic export pages for international markets — hydraulic systems, jacks, cylinders and power packs.",
    keywords: ["hydraulic exports", "Jyoti Hydraulic international"],
  });
}

export default async function ExportsHubPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: exportPages.id,
      title: exportPages.title,
      path: exportPages.path,
      country: exportPages.country,
      productLine: exportPages.productLine,
    })
    .from(exportPages)
    .where(eq(exportPages.status, "published"))
    .orderBy(asc(exportPages.country), asc(exportPages.title));

  return (
    <main className="listing-page location-hub-page">
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker">Global reach</p>
          <h1>Export Markets</h1>
          <p>
            Jyoti Hydraulic supplies hydraulic equipment to international
            markets. Browse export pages by country and product line.
          </p>
        </div>
      </div>
      <div className="site-container location-hub">
        <div className="location-hub__heading">
          <div>
            <p className="section-label">Exports</p>
            <h2>{rows.length} export pages</h2>
          </div>
          <p>
            Faridabad-based manufacturing with quality-focused hydraulic
            solutions for overseas industrial buyers.
          </p>
        </div>
        {rows.length ? (
          <ul className="location-hub__list location-hub__list--exports">
            {rows.map((item) => (
              <li key={item.id}>
                <Link href={publicPath(item.path)}>
                  <span>{item.country || item.title}</span>
                  {item.productLine ? <small>{item.productLine}</small> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="cms-empty-state">
            <span>Exports</span>
            <h2>Export pages are being prepared</h2>
            <p>Published export market pages will appear here automatically.</p>
          </div>
        )}
      </div>
    </main>
  );
}
