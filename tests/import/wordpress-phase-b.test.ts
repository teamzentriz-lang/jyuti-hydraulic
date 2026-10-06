import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCatalogGraph, pagePathFromLink, slugFromPath } from "@/lib/import/wordpress-catalog";
import {
  buildMediaLookup,
  extractSpecsFromHtml,
  processWordPressHtml,
  resolveMediaIdFromUrl,
} from "@/lib/import/wordpress-html";
import { parsePhaseBCliOptions } from "@/lib/import/wordpress-phase-b";
import type { WpPageItem } from "@/lib/import/wordpress-client";

function page(id: number, link: string, parent: number, slug?: string): WpPageItem {
  return {
    id,
    slug: slug ?? link.split("/").filter(Boolean).pop() ?? "x",
    link,
    parent,
    featured_media: 0,
    title: { rendered: `Page ${id}` },
    content: { rendered: "<p>Body</p>" },
  };
}

test("pagePathFromLink normalizes trailing slashes", () => {
  assert.equal(
    pagePathFromLink("https://jyotihydraulic.com/hydraulic-power-pack/mini-hydraulic-power-pack/"),
    "hydraulic-power-pack/mini-hydraulic-power-pack",
  );
});

test("buildCatalogGraph marks leaves as products", () => {
  const pages = [
    page(1, "https://jyotihydraulic.com/hydraulic-power-pack/", 0, "hydraulic-power-pack"),
    page(2, "https://jyotihydraulic.com/hydraulic-power-pack/mini-hydraulic-power-pack/", 1, "mini-hydraulic-power-pack"),
    page(99, "https://jyotihydraulic.com/about-us/", 0, "about-us"),
  ];
  const graph = buildCatalogGraph(pages);
  assert.equal(graph.length, 2);
  const root = graph.find((row) => row.id === 1);
  const leaf = graph.find((row) => row.id === 2);
  assert.equal(root?.isLeaf, false);
  assert.equal(leaf?.isLeaf, true);
});

test("products/ prefix tree is included", () => {
  const pages = [
    page(10, "https://jyotihydraulic.com/products/", 0, "products"),
    page(11, "https://jyotihydraulic.com/products/hydraulic-power-pack/", 10),
    page(12, "https://jyotihydraulic.com/products/hydraulic-power-pack/mini-hydraulic-power-pack/", 11),
  ];
  const graph = buildCatalogGraph(pages);
  assert.equal(graph.length, 3);
});

test("media rewrite uses legacy URL lookup", () => {
  const legacy = "https://jyotihydraulic.com/wp-content/uploads/2024/06/pump.jpg";
  const lookup = buildMediaLookup([{ id: "media-1", legacyUrl: legacy }]);
  assert.equal(resolveMediaIdFromUrl(legacy, lookup), "media-1");
  const html = processWordPressHtml(
    `<p>Hi</p><img src="${legacy}" alt="Pump" />`,
    lookup,
  );
  assert.match(html, /src="\/api\/media\/media-1"/);
});

test("extractSpecsFromHtml reads table rows", () => {
  const specs = extractSpecsFromHtml(
    "<table><tr><th>Pressure</th><td>210 bar</td></tr><tr><th>Flow</th><td>20 lpm</td></tr></table>",
  );
  assert.equal(specs.length, 2);
  assert.equal(specs[0]?.label, "Pressure");
  assert.equal(specs[0]?.value, "210 bar");
});

test("slugFromPath uses last segment", () => {
  assert.equal(slugFromPath("hydraulic-power-pack/mini-hydraulic-power-pack"), "mini-hydraulic-power-pack");
});

test("parsePhaseBCliOptions enables incremental mode and keeps seed catalogue", () => {
  const options = parsePhaseBCliOptions(["--skip-existing", "--skip-seo"]);
  assert.equal(options.skipExisting, true);
  assert.equal(options.skipSeo, true);
  assert.equal(options.purgeDummy, false);
});

test("parsePhaseBCliOptions --incremental alias", () => {
  assert.equal(parsePhaseBCliOptions(["--incremental"]).skipExisting, true);
});
