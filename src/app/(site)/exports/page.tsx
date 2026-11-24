import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
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
    <main className="catalogue-browser-root location-hub-page">
      <section className="site-page-banner catalogue-page-banner" aria-label="Page Header">
        <div className="site-container page-banner-inner">
          <div className="catalogue-banner-crumbs">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { label: "Exports" },
              ]}
            />
          </div>
          <h1 className="catalogue-banner-title">Export Markets</h1>
          <p className="catalogue-banner-subtitle">
            ISO-9001:2015 Certified Company
          </p>
        </div>
      </section>

      <div className="site-container catalogue-page__inner location-hub">
        <section className="catalogue-bottom-content" aria-labelledby="exports-hub-title">
          <div className="catalogue-bottom-content__card">
            <div className="catalogue-bottom-content__header">
              <p className="eyebrow dark">Global reach</p>
              <h2 id="exports-hub-title">About our export pages</h2>
            </div>
            <div className="catalogue-bottom-content__summary">
              <p>
                Jyoti Hydraulic supplies hydraulic equipment to international
                markets. Browse export pages by country and product line for
                cylinders, power packs, screw jacks and more.
              </p>
            </div>
          </div>
        </section>

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
