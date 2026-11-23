import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
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
    <main className="listing-page location-hub-page">
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker">Service coverage</p>
          <h1>City Pages</h1>
          <p>
            Browse Jyoti Hydraulic location pages across India. Each city page
            highlights local product availability and engineering support.
          </p>
        </div>
      </div>
      <div className="site-container location-hub">
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
                  {(grouped.get(letter) ?? []).map((item) => (
                    <li key={item.id}>
                      <Link href={publicPath(item.path)}>
                        <span>{item.locationName || item.title}</span>
                        {item.region ? <small>{item.region}</small> : null}
                      </Link>
                    </li>
                  ))}
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
