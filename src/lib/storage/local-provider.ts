import { randomUUID } from "crypto";
import { access, mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { CmsError } from "@/db/errors";
import { buildStorageKey, resolvePathUnderRoot, safeFilename } from "@/lib/storage/keys";
import type { StorageProvider, StoredFile, UploadInput } from "@/lib/storage/types";

const LEGACY_ROOT = "storage";

export class LocalStorageProvider implements StorageProvider {
  readonly driver = "local" as const;

  constructor(
    private readonly rootDir: string,
    private readonly publicUrlBase: string,
  ) {}

  getUrl(key: string): string {
    const base = this.publicUrlBase.replace(/\/$/, "");
    return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  private primaryAbsolute(key: string) {
    return resolvePathUnderRoot(
      path.join(/* turbopackIgnore: true */ process.cwd(), this.rootDir),
      key,
    );
  }

  private legacyAbsolute(key: string) {
    return resolvePathUnderRoot(
      path.join(/* turbopackIgnore: true */ process.cwd(), LEGACY_ROOT),
      key,
    );
  }

  private async resolveExistingPath(key: string): Promise<string | null> {
    const primary = this.primaryAbsolute(key);
    if (await fileExists(primary)) return primary;
    const legacy = this.legacyAbsolute(key);
    if (await fileExists(legacy)) return legacy;
    return null;
  }

  async exists(key: string): Promise<boolean> {
    return (await this.resolveExistingPath(key)) !== null;
  }

  async getObject(key: string): Promise<Buffer> {
    const resolved = await this.resolveExistingPath(key);
    if (!resolved) throw new CmsError("File not found.");
    return readFile(resolved);
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    const filename = safeFilename(input.originalName);
    const storageKey =
      input.storageKey ??
      buildStorageKey({
        originalName: input.originalName,
        id: input.id ?? randomUUID(),
        prefix: input.prefix,
      });

    const absolute = this.primaryAbsolute(storageKey);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, input.body);

    return {
      storageDriver: "local",
      storageKey,
      url: this.getUrl(storageKey),
      size: input.body.length,
      mimeType: input.mimeType,
      filename,
    };
  }

  async delete(key: string): Promise<void> {
    const primary = this.primaryAbsolute(key);
    const legacy = this.legacyAbsolute(key);
    await rm(primary, { force: true });
    await rm(legacy, { force: true });
  }

  absolutePathForKey(key: string) {
    return this.primaryAbsolute(key);
  }
}

async function fileExists(absolute: string) {
  try {
    await access(absolute);
    return true;
  } catch {
    return false;
  }
}
