import assert from "node:assert/strict";
import { test } from "node:test";
import type { WpPageItem } from "@/lib/import/wordpress-client";
import {
  filterStaticPages,
  inferPageType,
  isCityPath,
  isExportPath,
  isFrontPagePath,
  postPathFromSlug,
} from "@/lib/import/wordpress-static";

function page(id: number, link: string, slug?: string): WpPageItem {
  return {
    id,
    slug: slug ?? link.split("/").filter(Boolean).pop() ?? "x",
    link,
    parent: 0,
    featured_media: 0,
    title: { rendered: `Page ${id}` },
    content: { rendered: "<p>Body</p>" },
  };
}

test("city and export paths are excluded from static import", () => {
  assert.equal(isCityPath("city/delhi"), true);
  assert.equal(isExportPath("exports/nepal"), true);
  const staticPages = filterStaticPages([
    page(1, "https://jyotihydraulic.com/about-us/", "about-us"),
    page(2, "https://jyotihydraulic.com/city/west-bengal/", "west-bengal"),
    page(3, "https://jyotihydraulic.com/exports/bangladesh/", "bangladesh"),
    page(4, "https://jyotihydraulic.com/hydraulic-power-pack/", "hydraulic-power-pack"),
  ]);
  assert.deepEqual(
    staticPages.map((row) => row.path),
    ["about-us"],
  );
});

test("home/front page is skipped", () => {
  assert.equal(isFrontPagePath("", "home"), true);
  assert.equal(
    filterStaticPages([page(1, "https://jyotihydraulic.com/", "home")]).length,
    0,
  );
});

test("inferPageType maps known static URLs", () => {
  assert.equal(inferPageType("about-us"), "about");
  assert.equal(inferPageType("blogs"), "blog_listing");
  assert.equal(inferPageType("career/jobs"), "custom");
});

test("postPathFromSlug normalizes blog slugs", () => {
  assert.equal(postPathFromSlug("Working-Principle-of-a-Screw-Jack"), "working-principle-of-a-screw-jack");
});
