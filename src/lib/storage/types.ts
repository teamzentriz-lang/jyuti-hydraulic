export type StorageDriver = "local" | "r2";

export type UploadInput = {
  body: Buffer;
  mimeType: string;
  originalName: string;
  /** Media row id or other stable id used in generated keys */
  id?: string;
  /** Full key when set (migrations / controlled uploads). Must pass safety checks. */
  storageKey?: string;
  /** Logical prefix, e.g. `products/hydraulic-cylinders` */
  prefix?: string;
};

export type StoredFile = {
  storageDriver: StorageDriver;
  storageKey: string;
  url: string;
  size: number;
  mimeType: string;
  filename: string;
};

export interface StorageProvider {
  readonly driver: StorageDriver;
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
  getObject(key: string): Promise<Buffer>;
  copy?(sourceKey: string, destinationKey: string): Promise<void>;
}

/** @deprecated Use StoredFile */
export type StoredObject = StoredFile;
