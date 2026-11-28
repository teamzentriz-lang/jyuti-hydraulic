import assert from "node:assert/strict";
import test from "node:test";
import { readProductScalars } from "../src/lib/cms/product-save";
import { sanitizeRichText } from "../src/lib/sanitize";
import {
  linkedArticlePaths,
  normalizeProductEditorHtml,
  normalizeProductSummary,
  removeOpeningArticleTitle,
  removeLeadingSummaryHtml,
  readableProductArticle,
  splitProductIntroduction,
} from "../src/lib/cms/product-article";
import { readPageScalars } from "../src/lib/cms/page-save";
import { cleanCategoryEditorBody } from "../src/lib/cms/legacy-product-listing";
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

test("product Overview keeps editor line breaks, heading emphasis and lists on save", () => {
  const overview = '<div>Product summary</div><div>New description</div><h2><i>Key features</i></h2><ul><li><b>High pressure</b></li></ul>';
  const parsed = readProductScalars(productForm({ overview, body: "<p>Previous description</p>" }));
  assert.equal(sanitizeRichText(parsed.overview), '<div>Product summary</div><div>New description</div><h2><em>Key features</em></h2><ul><li><strong>High pressure</strong></li></ul>');
});

test("category form preserves separate search and social metadata on save", () => {
  const form = productForm({
    subtitle: "Catalogue", seoTitle: "Hydraulic Cylinders | Jyoti",
    seoDescription: "Call +91 9541424317 for cylinder prices.",
    focusKeyword: "cylinder", canonicalUrl: "https://jyotihydraulic.com/products/hydraulic-cylinders/",
    ogTitle: "Cylinder sharing title", ogDescription: "Social description",
    twitterTitle: "Cylinder X title", twitterDescription: "X description",
    robotsFollow: "on",
  });
  const category = parseResource("product-categories", readFormData("product-categories", form));
  for (const key of ["seoTitle", "seoDescription", "canonicalUrl", "focusKeyword",
    "ogTitle", "ogDescription", "twitterTitle", "twitterDescription"]) {
    assert.equal(category[key], form.get(key));
  }
  assert.equal(category.robotsIndex, false);
  assert.equal(category.robotsFollow, true);
});

test("category editor removes imported cards and preserves the paragraphs either side", () => {
  const intro = "<p>Cylinder selection.</p>";
  const article = '<p>Installation notes.</p><img src="/diagram.png">';
  const card = '<a href="/products/cylinder/"><img src="/card.jpg">Double Acting Cylinder</a><a href="/products/cylinder/">Read More</a> inquiry now<p></p>';
  assert.equal(cleanCategoryEditorBody(intro + "<h2>Our Products</h2>" + card.repeat(2) + article), intro + article);
  const ordinary = "<h2>Our Products</h2>" + article;
  assert.equal(cleanCategoryEditorBody(ordinary), ordinary);
});

test("category editor removes nested WordPress cards with different image and CTA targets", () => {
  const intro = '<p>Power pack sizing.</p><img src="/diagram.png">';
  const card = '<a href="/old/image-target/"><img src="/pack.png">12V DC Hydraulic Power Pack<p></p>Description <a href="/products/12v/">Read More</a> inquiry now<p></p></a>';
  const article = '<h2>Overview</h2><p>24V systems are also available.</p>';
  assert.equal(cleanCategoryEditorBody(intro + "<h2>Our Products</h2>" + card.repeat(2) + article), intro + article);
  assert.equal(cleanCategoryEditorBody(article), article);
});

test("product summary is reduced to a usable public excerpt", () => {
  const summary = "Long imported content. ".repeat(500);
  const parsed = readProductScalars(productForm({ summary }));
  assert.ok(parsed.summary.length <= 320);
  assert.doesNotMatch(parsed.summary, /Long imported content\.\s+Long imported content\./);
});

test("article body removes only an imported opening duplicate title", () => {
  const title = "How to Select the Right Hydraulic Pump for an Industrial Power Pack? | Jyoti Hydraulic";
  const body =
    "<h2>How to Select the Right Hydraulic Pump for an Industrial Power Pack?</h2><p>Choose the pump by pressure and flow.</p><h2>Selection factors</h2><p>Check duty cycle.</p>";
  const result = removeOpeningArticleTitle(body, title);
  assert.doesNotMatch(result, /^\s*<h2>How to Select/i);
  assert.match(result, /Selection factors/);
});

test("article body keeps a meaningful opening heading", () => {
  const body = "<h2>Selection factors</h2><p>Check duty cycle.</p>";
  assert.equal(
    removeOpeningArticleTitle(body, "Hydraulic Pump Buying Guide"),
    body,
  );
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
