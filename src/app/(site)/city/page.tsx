import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getDb } from "@/db";
import { locationPages } from "@/db/schema";
import { getSettings } from "@/lib/cms/queries";
import { publicPath } from "@/lib/paths";
import { sitePageMetadata } from "@/lib/site-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return sitePageMetadata({
    companyName: settings.companyName,
    path: "city",
    title: "City Pages",
    description:
      "Find Jyoti Hydraulic product pages for cities across India — local supply, support and engineering coverage.",
    keywords: ["hydraulic manufacturers by city", "Jyoti Hydraulic cities"],
  });
}

export default async function CityHubPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: locationPages.id,
      title: locationPages.title,
      path: locationPages.path,
      locationName: locationPages.locationName,
      region: locationPages.region,
    })
    .from(locationPages)
    .where(eq(locationPages.status, "published"))
    .orderBy(asc(locationPages.locationName), asc(locationPages.title));

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const letter = (row.locationName || row.title || "#")
      .trim()
      .charAt(0)
      .toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  const letters = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <main className="catalogue-browser-root location-hub-page">
      <section className="site-page-banner catalogue-page-banner" aria-label="Page Header">
        <div className="site-container page-banner-inner">
          <div className="catalogue-banner-crumbs">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { label: "City Pages" },
              ]}
            />
          </div>
          <h1 className="catalogue-banner-title">City Pages</h1>
          <p className="catalogue-banner-subtitle">
            ISO-9001:2015 Certified Company
          </p>
        </div>
      </section>

      <div className="site-container catalogue-page__inner location-hub">
        <section className="catalogue-bottom-content" aria-labelledby="city-hub-title">
          <div className="catalogue-bottom-content__card">
            <div className="catalogue-bottom-content__header">
              <p className="eyebrow dark">Service coverage</p>
              <h2 id="city-hub-title">About our city pages</h2>
            </div>
            <div className="catalogue-bottom-content__summary">
              <p>
                Browse Jyoti Hydraulic location pages across India. Each city
                page highlights local product availability and engineering
                support for industrial buyers.
              </p>
            </div>
          </div>
        </section>

        <div className="location-hub__heading">
          <div>
            <p className="section-label">Locations</p>
            <h2>{rows.length} city pages</h2>
          </div>
          <p>
            Established in Faridabad since 2014 — serving industrial buyers
            nationwide with hydraulic equipment, jigs and fixtures.
          </p>
        </div>

        {letters.length ? (
          <div className="location-hub__groups">
            {letters.map((letter) => (
              <section key={letter} className="location-hub__group">
                <h3>{letter}</h3>
                <ul className="location-hub__list">
                  {(grouped.get(letter) ?? []).map((item) => {
                    const name = item.locationName || item.title;
                    const region =
                      item.region && item.region !== name ? item.region : null;
                    return (
                      <li key={item.id}>
                        <Link href={publicPath(item.path)}>
                          <span>{name}</span>
                          {region ? <small>{region}</small> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="cms-empty-state">
            <span>Cities</span>
            <h2>City pages are being prepared</h2>
            <p>Published location pages will appear here automatically.</p>
          </div>
        )}
      </div>
    </main>
  );
}
