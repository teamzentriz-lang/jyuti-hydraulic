import { LocalStorageProvider } from "@/lib/storage/local-provider";
import { R2StorageProvider, readR2ConfigFromEnv } from "@/lib/storage/r2-provider";
import type { StorageDriver, StorageProvider } from "@/lib/storage/types";

export function resolveStorageProviderName(): StorageDriver {
  const raw = (process.env.STORAGE_PROVIDER ?? process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  if (raw === "r2") return "r2";
  return "local";
}

export function currentStorageDriver(): StorageDriver {
  return resolveStorageProviderName();
}

export function createStorageProvider(driver: StorageDriver = resolveStorageProviderName()): StorageProvider {
  if (driver === "r2") {
    return new R2StorageProvider(readR2ConfigFromEnv());
  }
  const root = process.env.LOCAL_STORAGE_PATH?.replace(/\\/g, "/").replace(/^\.\//, "") ?? "public/uploads";
  const urlBase = process.env.LOCAL_STORAGE_URL ?? "/uploads";
  return new LocalStorageProvider(root, urlBase);
}

export function createStorageProviderForRecord(driver: StorageDriver): StorageProvider {
  return createStorageProvider(driver);
}
