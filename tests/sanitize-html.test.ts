import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtmlBlock } from "../src/lib/sanitize";

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
