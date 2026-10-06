import assert from "node:assert/strict";
import { test } from "node:test";
import { createStorageProvider, resolveStorageProviderName } from "@/lib/storage/factory";
import { LocalStorageProvider } from "@/lib/storage/local-provider";
import { R2StorageProvider } from "@/lib/storage/r2-provider";

test("resolveStorageProviderName prefers STORAGE_PROVIDER", () => {
  const prevProvider = process.env.STORAGE_PROVIDER;
  const prevDriver = process.env.STORAGE_DRIVER;
  process.env.STORAGE_PROVIDER = "r2";
  process.env.STORAGE_DRIVER = "local";
  assert.equal(resolveStorageProviderName(), "r2");
  process.env.STORAGE_PROVIDER = prevProvider;
  process.env.STORAGE_DRIVER = prevDriver;
});

test("createStorageProvider returns local without R2 env", () => {
  const prevProvider = process.env.STORAGE_PROVIDER;
  const prevDriver = process.env.STORAGE_DRIVER;
  const prevAccount = process.env.R2_ACCOUNT_ID;
  process.env.STORAGE_PROVIDER = "local";
  delete process.env.STORAGE_DRIVER;
  delete process.env.R2_ACCOUNT_ID;
  assert.ok(createStorageProvider() instanceof LocalStorageProvider);
  process.env.STORAGE_PROVIDER = prevProvider;
  process.env.STORAGE_DRIVER = prevDriver;
  process.env.R2_ACCOUNT_ID = prevAccount;
});

test("createStorageProvider returns R2 when configured", () => {
  const env = { ...process.env };
  process.env.STORAGE_PROVIDER = "r2";
  process.env.R2_ACCOUNT_ID = "acc";
  process.env.R2_ACCESS_KEY_ID = "key";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET_NAME = "bucket";
  process.env.R2_PUBLIC_URL = "https://cdn.example.com";
  assert.ok(createStorageProvider() instanceof R2StorageProvider);
  process.env = env;
});
