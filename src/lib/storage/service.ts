import {
  createStorageProvider,
  createStorageProviderForRecord,
  currentStorageDriver,
} from "@/lib/storage/factory";
import { safeFilename } from "@/lib/storage/keys";
import type { StorageDriver, StorageProvider, StoredFile, UploadInput } from "@/lib/storage/types";
import { assertUpload, assertUploadBuffer } from "@/lib/storage/validation";

let activeProvider: StorageProvider | null = null;

function getActiveProvider(): StorageProvider {
  if (!activeProvider || activeProvider.driver !== currentStorageDriver()) {
    activeProvider = createStorageProvider();
  }
  return activeProvider;
}

export class StorageService {
  get driver(): StorageDriver {
    return getActiveProvider().driver;
  }

  upload(input: UploadInput): Promise<StoredFile> {
    assertUploadBuffer({
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.body.length,
    });
    return getActiveProvider().upload(input);
  }

  delete(key: string, driver?: StorageDriver): Promise<void> {
    const provider = driver ? createStorageProviderForRecord(driver) : getActiveProvider();
    return provider.delete(key);
  }

  exists(key: string, driver?: StorageDriver): Promise<boolean> {
    const provider = driver ? createStorageProviderForRecord(driver) : getActiveProvider();
    return provider.exists(key);
  }

  getUrl(key: string, driver?: StorageDriver): string {
    const provider = driver ? createStorageProviderForRecord(driver) : getActiveProvider();
    return provider.getUrl(key);
  }

  getObject(key: string, driver?: StorageDriver): Promise<Buffer> {
    const provider = driver ? createStorageProviderForRecord(driver) : getActiveProvider();
    return provider.getObject(key);
  }
}

export const storageService = new StorageService();

export async function saveUpload(
  file: File,
  id: string,
  options?: { prefix?: string },
): Promise<StoredFile> {
  assertUpload(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  return storageService.upload({
    body: bytes,
    mimeType: file.type,
    originalName: file.name,
    id,
    prefix: options?.prefix,
  });
}

export async function deleteStoredObject(driver: StorageDriver, storageKey: string) {
  await storageService.delete(storageKey, driver);
}

export async function readLocalObject(storageKey: string) {
  return storageService.getObject(storageKey, "local");
}

export function storedFilenameFromUpload(originalName: string) {
  return safeFilename(originalName);
}
