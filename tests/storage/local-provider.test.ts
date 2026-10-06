import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { LocalStorageProvider } from "@/lib/storage/local-provider";

test("LocalStorageProvider upload, getUrl, exists, delete", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "jh-storage-"));
  const uploadsDir = path.join(tempRoot, "public", "uploads");
  const provider = new LocalStorageProvider(path.relative(tempRoot, uploadsDir).replace(/\\/g, "/"), "/uploads");

  const originalCwd = process.cwd();
  process.chdir(tempRoot);
  try {
    const stored = await provider.upload({
      body: Buffer.from("hello"),
      mimeType: "image/png",
      originalName: "test.png",
      id: "22222222-2222-2222-2222-222222222222",
      prefix: "gallery/factory",
    });

    assert.equal(stored.storageDriver, "local");
    assert.equal(stored.url, `/uploads/${stored.storageKey}`);
    assert.equal(await provider.exists(stored.storageKey), true);
    assert.equal((await provider.getObject(stored.storageKey)).toString(), "hello");
    await provider.delete(stored.storageKey);
    assert.equal(await provider.exists(stored.storageKey), false);
  } finally {
    process.chdir(originalCwd);
    await rm(tempRoot, { recursive: true, force: true });
  }
});
