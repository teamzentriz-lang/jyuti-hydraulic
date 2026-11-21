import assert from "node:assert/strict";
import test from "node:test";
import { readProductScalars } from "../src/lib/cms/product-save";
import {
  linkedArticlePaths,
  normalizeProductEditorHtml,
  normalizeProductSummary,
  removeLeadingSummaryHtml,
  readableProductArticle,
  splitProductIntroduction,
} from "../src/lib/cms/product-article";
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

test("product summary is reduced to a usable public excerpt", () => {
  const summary = "Long imported content. ".repeat(500);
  const parsed = readProductScalars(productForm({ summary }));
  assert.ok(parsed.summary.length <= 320);
  assert.doesNotMatch(parsed.summary, /Long imported content\.\s+Long imported content\./);
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
    '<p>Product conclusion.</p><p>Blogs</p><h2>Industrial Baling Solutions</h2><p>Summary</p><p>Read More</p><h2>Worm Gear Guide</h2><p>Summary</p><p>Read More</p>';
  const result = readableProductArticle(html);
  assert.match(result, /Product conclusion/);
  assert.doesNotMatch(result, /Industrial Baling Solutions|Worm Gear Guide|Read More/);
});

test("legacy related blog links remain available for CMS cards", () => {
  const paths = linkedArticlePaths(
    '<a href="https://jyotihydraulic.com/worm-gear-guide/">Guide</a><a href="/worm-gear-guide/">Duplicate</a><a href="https://example.com/nope/">External</a>',
  );
  assert.deepEqual(paths, ["worm-gear-guide"]);
});

test("product editor keeps blog cards and images outside the description", () => {
  const result = normalizeProductEditorHtml(
    '<p>Product copy</p><p>Blogs</p><figure><img src="/blog.jpg" /></figure><p>Read More</p><h2>Details</h2><p>Technical copy</p><img src="/product.jpg" />',
  );
  assert.match(result, /Product copy/);
  assert.match(result, /Technical copy/);
  assert.doesNotMatch(result, /Blogs|Read More|blog\.jpg|product\.jpg/);
});

test("product editor removes a complete trailing blog section with headings", () => {
  const result = normalizeProductEditorHtml(
    '<p>Product copy</p><div>Blogs</div><h2>First blog</h2><p>Read More</p><h2>Second blog</h2><p>Read More</p>',
  );
  assert.equal(result, "<p>Product copy</p>");
});

test("product content removes imported contact blocks", () => {
  const result = readableProductArticle(
    "<p>Useful product copy.</p><p>📞 +91 9541424317<br />✉ jyotihydraulic@gmail.com</p><h2>Working Principle</h2><p>Technical content.</p>",
  );
  assert.match(result, /Useful product copy/);
  assert.match(result, /Technical content/);
  assert.doesNotMatch(result, /9541424317|jyotihydraulic@gmail.com/);
});

test("product content removes standalone contact icon blocks", () => {
  const result = readableProductArticle(
    "<p>Useful product copy.</p><p>📞</p><p>✉️</p><h2>Details</h2><p>Technical content.</p>",
  );
  assert.doesNotMatch(result, /📞|✉/);
  assert.match(result, /Useful product copy|Technical content/);
});

test("summary cleanup removes imported contact details and CTAs", () => {
  const result = normalizeProductSummary(
    "Product copy. Get Your Quote Instantly 📞 +91 9541424317 ✉ jyotihydraulic@gmail.com",
  );
  assert.equal(result, "Product copy.");
});

test("overview does not repeat the summary opening", () => {
  const html =
    "<h2>Worm Gear Screw Jack 50 Ton</h2><p>Product introduction for controlled lifting.</p><p>Choose the right capacity for your machine.</p><h2>Working Principle</h2><p>Technical details remain visible.</p>";
  const result = removeLeadingSummaryHtml(
    html,
    "Worm Gear Screw Jack 50 Ton Product introduction for controlled lifting. Choose the right capacity for your machine.",
  );
  assert.doesNotMatch(result, /Product introduction/);
  assert.match(result, /Working Principle|Technical details/);
});

test("product introduction is shown separately from detailed sections", () => {
  const split = splitProductIntroduction(
    "<h2>Worm Gear Screw Jack 100 Ton</h2><p>Short introduction.</p><h2>Working Principle</h2><p>Detailed content.</p>",
    "Worm Gear Screw Jack 100 Ton",
  );
  assert.match(split.introductionHtml, /Short introduction/);
  assert.doesNotMatch(split.introductionHtml, /Detailed content/);
  assert.match(split.detailHtml, /Working Principle/);
  assert.match(split.detailHtml, /Detailed content/);
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
