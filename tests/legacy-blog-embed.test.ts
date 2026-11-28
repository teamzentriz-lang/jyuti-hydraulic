import assert from "node:assert/strict";
import test from "node:test";
import {
  hasLegacyBlogEmbed,
  legacyBlogEmbedSnippet,
  removeLegacyBlogEmbed,
} from "../src/lib/cms/legacy-blog-embed";
import {
  normalizeLocationBody,
  normalizeProductEditorHtml,
  readableProductArticle,
} from "../src/lib/cms/product-article";

const typicalEmbed = `
<p>Useful product conclusion.</p>
<p>Blogs</p>
<p>1 Oct</p>
<h2>Industrial Baling Solutions Price in India: Complete 2026 Buyer’s Guide – Jyoti Hydraulic</h2>
<p>Jyoti Hydraulic understands that purchasing an industrial baling machine is…</p>
<p><a href="/industrial-baling-solutions/">Read More</a></p>
<p>30 Sep</p>
<h2>Understanding the Working Principle of a Worm Gear Screw Jack – Jyoti Hydraulic</h2>
<p>Jyoti Hydraulic understands that industrial lifting is not simply about…</p>
<p><a href="/working-principle/">Read More</a></p>
<p>25 Sep</p>
<h2>Industrial Worm Gear Screw Jack Manufacturers in India – Jyoti Hydraulic</h2>
<p>Jyoti Hydraulic provides engineered lifting and positioning solutions…</p>
<p><a href="/manufacturers/">Read More</a></p>
`;

test("city editor and public body omit text-only Our Blogs cards and keep adjacent content", () => {
  const intro = "<p>Our power packs deliver unmatched durability.</p>";
  const ending = "<h2>Local support</h2><p>Call our service team.</p>";
  const cards = '<h2><a href="/rotary-union/">What Is a Hydraulic Rotary Union?</a></h2><p>Reliable fluid transfer is essential…</p>' +
    "<h2>Worm Gear Screw Jack vs Ball Screw Jack | Jyoti Hydraulic</h2><p>Choosing the right lifting mechanism&hellip;</p>";
  for (const label of ["<p>Our Blogs</p>", " Our Blogs "]) {
    const body = intro + label + cards + ending;
    assert.equal(hasLegacyBlogEmbed(body), true);
    assert.equal(normalizeLocationBody(body, "Delhi"), intro + ending);
  }
  assert.equal(normalizeLocationBody(intro + " Our Blogs <ul><li>" + cards + "</li></ul>" + ending, "Delhi"), intro + ending);
  assert.equal(normalizeLocationBody(intro + "<p>Our Blogs</p>" + ending, "Delhi"), intro + "<p>Our Blogs</p>" + ending);
});

test("removes typical WordPress blog cards from product copy", () => {
  const result = removeLegacyBlogEmbed(typicalEmbed);
  assert.match(result, /Useful product conclusion/);
  assert.doesNotMatch(result, /Industrial Baling Solutions|Worm Gear Screw Jack Manufacturers|Read More|1 Oct|Blogs/);
  assert.equal(hasLegacyBlogEmbed(result), false);
});

test("removes bare-text Blogs marker followed by a WordPress card list", () => {
  const html = `
    <p>Share the application requirements to obtain an appropriate offer.</p>
			Blogs		
			<ul>
			  <li>
			    <a href="https://jyotihydraulic.com/industrial-baling-solutions-price-in-india-complete-2026-buyers-guide/">
			      <img src="https://jyotihydraulic.com/wp-content/uploads/2026/10/baling.png" alt="Industrial Baling Solutions" />
			    </a>
			    1 Oct
			    <h2><a href="https://jyotihydraulic.com/industrial-baling-solutions-price-in-india-complete-2026-buyers-guide/">Industrial Baling Solutions Price in India</a></h2>
			    <p>Jyoti Hydraulic understands that purchasing an industrial baling machine is…</p>
			    <a href="https://jyotihydraulic.com/industrial-baling-solutions-price-in-india-complete-2026-buyers-guide/">Read More</a>
			  </li>
			  <li>
			    <h2>Understanding the Working Principle of a Worm Gear Screw Jack</h2>
			    <a href="/working-principle/">Read More</a>
			  </li>
			</ul>
  `;
  const result = removeLegacyBlogEmbed(html);
  assert.match(result, /Share the application requirements/);
  assert.doesNotMatch(result, /Blogs|Industrial Baling|Read More|Working Principle of a Worm Gear/);
  assert.equal(hasLegacyBlogEmbed(html), true);
  assert.equal(hasLegacyBlogEmbed(result), false);
});

test("removes typical blog cards from city copy while keeping headings", () => {
  const html = `
    <h2>Hydraulic Solutions in Delhi</h2>
    <p>Local manufacturing support for industrial buyers.</p>
    <div>Our Blogs</div>
    <figure><img src="/blog.jpg" alt="Blog" /></figure>
    <p>Read More</p>
  `;
  const result = normalizeLocationBody(html, "Delhi");
  assert.match(result, /Hydraulic Solutions in Delhi/);
  assert.match(result, /Local manufacturing support/);
  assert.doesNotMatch(result, /Our Blogs|Read More|blog\.jpg/);
});

test("strips mid-body product images and contact chrome from city copy", () => {
  const html = `
    <h2>15 Hp Hydraulic Power Pack in Chhota Udaipur</h2>
    <p>Industrial power packs for local manufacturers.</p>
    inquiry now
    <img src="https://jyotihydraulic.com/wp-content/uploads/2025/07/Hydraulic-Power-Pack-New.png" alt="pack" />
    <h2>Ovierview</h2>
    <p>Overview details stay.</p>
    <h3>Contact With Us</h3>
    <h2>Feel free to write our team anytime</h2>
  `;
  const result = normalizeLocationBody(html, "Chhota Udaipur");
  assert.match(result, /Industrial power packs/);
  assert.match(result, /Overview details stay/);
  assert.match(result, /<h2>Overview<\/h2>/);
  assert.doesNotMatch(
    result,
    /Hydraulic-Power-Pack-New|inquiry now|Contact With Us|Feel free to write|Ovierview|<img/i,
  );
});

test("keeps legitimate product images and links outside the blog embed", () => {
  const html = `
    <p>Overview of the 20 ton jack.</p>
    <p><a href="/contact/">Request a quote</a></p>
    <p>Blogs</p>
    <figure><img src="/legacy-blog.jpg" /></figure>
    <p>Read More</p>
    <h2>Working Principle</h2>
    <p>Technical details remain.</p>
  `;
  const result = removeLegacyBlogEmbed(html);
  assert.match(result, /Overview of the 20 ton jack/);
  assert.match(result, /Request a quote/);
  assert.match(result, /Working Principle/);
  assert.match(result, /Technical details remain/);
  assert.doesNotMatch(result, /legacy-blog\.jpg|Read More|>\s*Blogs\s*</);
});

test("keeps city headings and paragraphs when no blog embed exists", () => {
  const html =
    "<h2>About Faridabad</h2><p>Trusted hydraulic manufacturing hub.</p>";
  assert.equal(removeLegacyBlogEmbed(html), html);
  assert.equal(hasLegacyBlogEmbed(html), false);
});

test("leaves clean descriptions unchanged", () => {
  const html = "<p>No blog cards here.</p>";
  assert.equal(removeLegacyBlogEmbed(html), html);
});

test("removes multiple legacy blog sections in one description", () => {
  const html = `
    <p>Intro</p>
    <p>Blogs</p><h2>First</h2><p>Read More</p>
    <h2>Keep this section</h2><p>Valid copy</p>
    <p>Our Blogs</p><h2>Second</h2><p>Read More</p>
  `;
  const result = removeLegacyBlogEmbed(html);
  assert.match(result, /Intro/);
  assert.match(result, /Keep this section|Valid copy/);
  assert.doesNotMatch(result, /First|Second|Read More|Blogs/);
});

test("cleanup is idempotent", () => {
  const once = removeLegacyBlogEmbed(typicalEmbed);
  const twice = removeLegacyBlogEmbed(once);
  assert.equal(twice, once);
});

test("does not remove normal copy that only mentions blogs", () => {
  const html =
    "<p>Customers often ask about our blogs and knowledge centre.</p><h2>Specs</h2><p>Details</p>";
  assert.equal(removeLegacyBlogEmbed(html), html);
});

test("public product rendering also strips embeds", () => {
  const result = readableProductArticle(typicalEmbed);
  assert.match(result, /Useful product conclusion/);
  assert.doesNotMatch(result, /Industrial Baling Solutions|Read More/);
});

test("product editor normalization strips embeds", () => {
  const result = normalizeProductEditorHtml(typicalEmbed);
  assert.match(result, /Useful product conclusion/);
  assert.doesNotMatch(result, /Blogs|Read More|Industrial Baling/);
});

test("snippet helper surfaces detected legacy content", () => {
  const snippet = legacyBlogEmbedSnippet(typicalEmbed);
  assert.match(snippet, /Blogs/i);
});
