import assert from "node:assert/strict";
import { test } from "node:test";
import type { WpPageItem } from "@/lib/import/wordpress-client";
import {
  filterCityPages,
  filterExportPages,
  parseExportCountry,
  parseExportProductLine,
  parseLocationName,
  productHintFromGeoSlug,
} from "@/lib/import/wordpress-geo";

function page(id: number, link: string): WpPageItem {
  return {
    id,
    slug: link.split("/").filter(Boolean).pop() ?? "x",
    link,
    parent: 0,
    featured_media: 0,
    title: { rendered: "Title" },
    content: { rendered: "<p>Body</p>" },
  };
}

test("filterCityPages keeps only /city/{slug}/ URLs", () => {
  const rows = filterCityPages([
    page(1, "https://jyotihydraulic.com/city/palwal/"),
    page(2, "https://jyotihydraulic.com/city/"),
    page(3, "https://jyotihydraulic.com/about-us/"),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.path, "city/palwal");
});

test("filterExportPages keeps only /exports/{slug}/ URLs", () => {
  const rows = filterExportPages([page(1, "https://jyotihydraulic.com/exports/bangladesh/")]);
  assert.equal(rows[0]?.path, "exports/bangladesh");
});

test("parseLocationName reads title and slug", () => {
  assert.equal(
    parseLocationName("Scrap Baling Machine Manufacturers in West Bengal", "scrap-baling-machine-manufacturers-in-west-bengal"),
    "West Bengal",
  );
  assert.equal(parseLocationName("City page", "hydraulic-jacks-in-palwal"), "Palwal");
});

test("parseExport fields", () => {
  assert.equal(parseExportCountry("Worm Gear Screw Jack Manufacturer in Bangladesh", "bangladesh"), "Bangladesh");
  assert.match(parseExportProductLine("Hydraulic Power Pack Manufacturer in Nepal", "nepal"), /Hydraulic Power Pack/i);
});

test("productHintFromGeoSlug strips location suffix", () => {
  assert.equal(
    productHintFromGeoSlug("scrap-baling-machine-manufacturers-in-palwal"),
    "scrap-baling-machine-manufacturers",
  );
});
