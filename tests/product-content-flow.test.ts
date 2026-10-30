import assert from "node:assert/strict";
import test from "node:test";
import { readProductScalars } from "../src/lib/cms/product-save";
import { readableProductArticle } from "../src/lib/cms/product-article";
import { readPageScalars } from "../src/lib/cms/page-save";
import { parseResource, readFormData } from "../src/lib/cms/resources";

function productForm(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    title: "Worm Gear Screw Jack 100 Ton",
    slug: "worm-gear-screw-jack-100-ton",
    path: "products/worm-gear-screw-jack-100-ton",
    summary: "Summary",
    overview: "<p>Overview</p>",
    sortOrder: "0",
    status: "published",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("product summary accepts imported long-form content", () => {
  const summary = "Long imported content. ".repeat(500);
  const parsed = readProductScalars(productForm({ summary }));
  assert.equal(parsed.summary, summary.trim());
});

test("public product article keeps content after contact calls to action", () => {
  const html =
    "<p>Intro</p><p>Get in Touch</p><h2>Working Principle</h2><p>Important technical details.</p>";
  const result = readableProductArticle(html);
  assert.match(result, /Working Principle/);
  assert.match(result, /Important technical details/);
});

test("public product article removes an imported inline blog card", () => {
  const html =
    '<p>Product conclusion.</p><p>Blogs</p><figure><img src="/legacy-card.jpg" /></figure><p>Industrial Baling Solutions</p><p>Read More</p>';
  const result = readableProductArticle(html);
  assert.match(result, /Product conclusion/);
  assert.doesNotMatch(result, /Industrial Baling Solutions/);
  assert.doesNotMatch(result, /Read More/);
});

test("page excerpts accept long imported copy", () => {
  const data = productForm({
    pageType: "custom",
    excerpt: "Imported page excerpt. ".repeat(500),
    shortDescription: "Imported short description. ".repeat(500),
    body: "<p>Page body</p>",
  });
  const parsed = readPageScalars(data);
  assert.ok(parsed.excerpt.length > 2_000);
  assert.ok(parsed.shortDescription.length > 2_000);
});

test("blog excerpts accept long imported copy", () => {
  const data = new FormData();
  data.set("title", "Long blog post");
  data.set("slug", "long-blog-post");
  data.set("excerpt", "Imported blog excerpt. ".repeat(500));
  data.set("body", "<p>Complete blog body</p>");
  data.set("status", "published");
  const parsed = parseResource("posts", readFormData("posts", data));
  assert.ok(String(parsed.excerpt).length > 2_000);
});
