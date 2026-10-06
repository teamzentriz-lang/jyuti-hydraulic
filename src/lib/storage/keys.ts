import path from "path";
import { CmsError } from "@/db/errors";

const MAX_KEY_LENGTH = 512;

export function safeFilename(name: string) {
  const ext = path.extname(name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const stem = path.basename(name, path.extname(name));
  const base = stem
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const safeStem = base || "file";
  return ext && ext.length <= 10 ? `${safeStem}${ext}` : safeStem;
}

export function normalizeKeyPrefix(prefix: string) {
  const cleaned = prefix
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  if (!cleaned) throw new CmsError("Invalid storage prefix.");
  assertSafeStorageKey(cleaned);
  return cleaned;
}

export function assertSafeStorageKey(storageKey: string) {
  if (!storageKey || storageKey.length > MAX_KEY_LENGTH) {
    throw new CmsError("Invalid storage key.");
  }
  if (storageKey.includes("\\") || storageKey.startsWith("/") || storageKey.includes("\0")) {
    throw new CmsError("Invalid storage key.");
  }
  const segments = storageKey.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    throw new CmsError("Invalid storage key.");
  }
}

export function buildStorageKey(options: {
  originalName: string;
  id: string;
  prefix?: string;
  storageKey?: string;
}) {
  if (options.storageKey) {
    assertSafeStorageKey(options.storageKey);
    return options.storageKey;
  }

  const filename = safeFilename(options.originalName);
  const uniqueName = `${options.id}-${filename}`;
  const prefix = options.prefix?.trim()
    ? normalizeKeyPrefix(options.prefix)
    : defaultUploadPrefix();

  const storageKey = `${prefix}/${uniqueName}`;
  assertSafeStorageKey(storageKey);
  return storageKey;
}

function defaultUploadPrefix() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `library/${year}/${month}`;
}

export function resolvePathUnderRoot(root: string, storageKey: string) {
  assertSafeStorageKey(storageKey);
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, storageKey);
  const relative = path.relative(absoluteRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new CmsError("Invalid storage key.");
  }
  return absolute;
}
