import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtmlBlock, sanitizeRichText } from "../src/lib/sanitize";
import { normalizeLocationBody } from "../src/lib/cms/product-article";

test("export body keeps editor bold across save and public rendering", () => {
  const body = '<h2>Applications</h2><p>Plain <b>lifting</b>, <span style="color:red; font-weight: 700" onclick="bad()">positioning</span> and <strong>support</strong>.</p>';
  const saved = sanitizeRichText(normalizeLocationBody(body, "Australia"));
  assert.equal(normalizeLocationBody(saved, "Australia"), "<h2>Applications</h2><p>Plain <strong>lifting</strong>, <strong>positioning</strong> and <strong>support</strong>.</p>");
});

test("common HTML preserves valid JSON-LD and removes executable markup", () => {
  const result = sanitizeHtmlBlock(
    '<div class="promo" onclick="alert(1)">Offer</div><iframe src="https://evil.example"></iframe><script>alert(1)</script><script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage"}</script>',
  );

  assert.match(result, /class="promo"/);
  assert.match(result, /<script type="application\/ld\+json">/);
  assert.match(result, /"@type":"FAQPage"/);
  assert.doesNotMatch(result, /onclick|iframe|alert\(1\)/);
});

test("common HTML discards invalid JSON-LD", () => {
  const result = sanitizeHtmlBlock(
    '<script type="application/ld+json">{not valid json}</script><p>Footer</p>',
  );

  assert.equal(result, "<p>Footer</p>");
});
