import assert from "node:assert/strict";
import { test } from "node:test";
import {
  automationBlockMessage,
  canonicalLegacyUrl,
  contactGlobals,
  decodeWpText,
  isAutomationBlocked,
  pickLogoCandidate,
  prepareMediaItem,
  siteGlobals,
  wordpressStoragePrefix,
} from "@/lib/import/wordpress-phase-a";

test("decodeWpText strips tags and entities", () => {
  assert.equal(decodeWpText("<p>Jyoti &#8211; Hydraulic&amp; Co</p>"), "Jyoti – Hydraulic& Co");
});

test("prepareMediaItem keeps the original upload and drops unknown types", () => {
  const prepared = prepareMediaItem({
    source_url: "https://jyotihydraulic.com/wp-content/uploads/2024/06/Pump Photo.JPG?v=1",
    mime_type: "image/jpeg",
    alt_text: "Pump",
    title: { rendered: "Pump Photo" },
    media_details: { width: 800, height: 600 },
    date_gmt: "2024-06-01T00:00:00",
  });
  assert.equal(prepared?.legacyUrl, "https://jyotihydraulic.com/wp-content/uploads/2024/06/Pump%20Photo.JPG");
  assert.equal(prepared?.prefix, "wordpress/2024/06");
  assert.equal(prepared?.mimeType, "image/jpeg");
  assert.equal(prepared?.width, 800);
  assert.equal(
    prepareMediaItem({
      source_url: "https://jyotihydraulic.com/wp-content/uploads/file.zip",
      mime_type: "application/zip",
    }),
    null,
  );
});

test("canonical urls and prefixes", () => {
  assert.equal(
    wordpressStoragePrefix("https://jyotihydraulic.com/wp-content/uploads/logo.png"),
    "wordpress/library",
  );
  assert.equal(
    canonicalLegacyUrl("https://jyotihydraulic.com/e-catalogue-jyoti-hydraulic-new.pdf#page=1"),
    "https://jyotihydraulic.com/e-catalogue-jyoti-hydraulic-new.pdf",
  );
});

test("logo picker prefers the Jyoti logo over a resized icon", () => {
  const picked = pickLogoCandidate([
    { id: "1", filename: "logo-300x80.png", mimeType: "image/png" },
    { id: "2", filename: "jyoti-hydraulic-logo.png", mimeType: "image/png" },
    { id: "3", filename: "catalogue.pdf", mimeType: "application/pdf" },
  ]);
  assert.equal(picked?.id, "2");
});

test("globals keep the Faridabad contact details and do not include home copy", () => {
  const globals = siteGlobals("https://jyotihydraulic.com");
  assert.equal(globals.city, "Faridabad");
  assert.equal(globals.phonePrimary, "+91 9541424317, 8813881451");
  assert.match(globals.catalogueLegacyUrl, /e-catalogue-jyoti-hydraulic-new\.pdf$/);
  assert.equal(contactGlobals().email, "info@jyotihydraulic.com");
  assert.equal("heroHeadline" in globals, false);
});

test("bot protection message names the whitelist step", () => {
  assert.equal(isAutomationBlocked(403, ""), true);
  assert.match(automationBlockMessage("https://jyotihydraulic.com"), /whitelist/i);
});
