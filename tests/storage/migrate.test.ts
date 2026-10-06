import assert from "node:assert/strict";
import { test } from "node:test";
import { LocalStorageProvider } from "@/lib/storage/local-provider";
import { R2StorageProvider } from "@/lib/storage/r2-provider";

test("R2 upload preserves storageKey (mocked client)", async () => {
  const sent: { Key?: string; Body?: Buffer }[] = [];
  const provider = new R2StorageProvider({
    accountId: "acc",
    accessKeyId: "key",
    secretAccessKey: "secret",
    bucket: "bucket",
    publicUrl: "https://cdn.example.com",
  });

  (provider as unknown as { client: { send: (command: { input: { Key?: string; Body?: Buffer } }) => Promise<unknown> } }).client =
    {
      send: async (command: { input: { Key?: string; Body?: Buffer } }) => {
        sent.push(command.input);
        return {};
      },
    };

  const key = "products/cylinders/image-1.webp";
  await provider.upload({
    body: Buffer.from("bytes"),
    mimeType: "image/webp",
    originalName: "image-1.webp",
    storageKey: key,
  });

  assert.equal(sent[0]?.Key, key);
  assert.equal(provider.getUrl(key), "https://cdn.example.com/products/cylinders/image-1.webp");
});

test("LocalStorageProvider idempotent delete", async () => {
  const provider = new LocalStorageProvider("public/uploads", "/uploads");
  await assert.doesNotReject(async () => provider.delete("missing/file.webp"));
});
