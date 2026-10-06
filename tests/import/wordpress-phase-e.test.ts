import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeWordPressSizedUploadUrl } from "@/lib/import/wordpress-phase-a";
import { buildMediaLookup, collectImageRefs, resolveMediaIdFromUrl } from "@/lib/import/wordpress-html";
import { wpUrlToHref } from "@/lib/import/wordpress-nav";
import { pathKey } from "@/lib/import/wordpress-url-audit";

test("collectImageRefs keeps src and alt", () => {
  const refs = collectImageRefs('<p><img src="https://jyotihydraulic.com/wp-content/uploads/a.jpg" alt="Pump A" /></p>');
  assert.equal(refs.length, 1);
  assert.equal(refs[0]?.alt, "Pump A");
});

test("resolveMediaIdFromUrl matches WordPress sized image URLs", () => {
  const full = "https://jyotihydraulic.com/wp-content/uploads/2026/01/JYOTI-HYDRAULIC-ISO-Certificate-1.jpg";
  const sized =
    "https://jyotihydraulic.com/wp-content/uploads/2026/01/JYOTI-HYDRAULIC-ISO-Certificate-1-725x1024.jpg";
  const lookup = buildMediaLookup([{ id: "cert-media-id", legacyUrl: full }]);
  assert.equal(resolveMediaIdFromUrl(sized, lookup), "cert-media-id");
  assert.equal(
    normalizeWordPressSizedUploadUrl(sized),
    "https://jyotihydraulic.com/wp-content/uploads/2026/01/JYOTI-HYDRAULIC-ISO-Certificate-1.jpg",
  );
});

test("wpUrlToHref maps same-origin links to trailing-slash paths", () => {
  assert.equal(wpUrlToHref("https://jyotihydraulic.com/about-us/"), "/about-us/");
});

test("pathKey normalizes audit keys", () => {
  assert.equal(pathKey("city/palwal/"), "/city/palwal/");
});
