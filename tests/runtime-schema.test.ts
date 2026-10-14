import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("request-time CMS query module contains no schema DDL", () => {
  const source = readFileSync(new URL("../src/lib/cms/queries.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:ALTER|CREATE|DROP)\s+(?:TABLE|INDEX|TYPE)\b/i);
  assert.doesNotMatch(source, /ADD\s+COLUMN/i);
});
