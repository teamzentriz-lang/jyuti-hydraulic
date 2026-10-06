import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSafeStorageKey, buildStorageKey, safeFilename } from "@/lib/storage/keys";

test("safeFilename strips unsafe characters", () => {
  assert.equal(safeFilename("My Photo (1).webp"), "My-Photo-1.webp");
});

test("assertSafeStorageKey rejects traversal", () => {
  assert.throws(() => assertSafeStorageKey("../etc/passwd"));
  assert.throws(() => assertSafeStorageKey("products/../../secret.pdf"));
});

test("buildStorageKey uses prefix and id", () => {
  const key = buildStorageKey({
    originalName: "image-1.webp",
    id: "11111111-1111-1111-1111-111111111111",
    prefix: "products/hydraulic-cylinders",
  });
  assert.match(key, /^products\/hydraulic-cylinders\//);
  assert.match(key, /11111111-1111-1111-1111-111111111111-image-1\.webp$/);
});
