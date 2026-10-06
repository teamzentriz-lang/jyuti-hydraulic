import { randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { CmsError } from "@/db/errors";
import { buildStorageKey, safeFilename } from "@/lib/storage/keys";
import type { StorageProvider, StoredFile, UploadInput } from "@/lib/storage/types";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

export function readR2ConfigFromEnv(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME ?? process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new CmsError(
      "R2 storage is selected, but R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME (or R2_BUCKET), and R2_PUBLIC_URL are not all set.",
    );
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ""),
  };
}

export class R2StorageProvider implements StorageProvider {
  readonly driver = "r2" as const;
  private readonly client: S3Client;

  constructor(private readonly config: R2Config) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  getUrl(key: string): string {
    return `${this.config.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getObject(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    const body = response.Body;
    if (!body) throw new CmsError("File not found.");
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
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

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
        Body: input.body,
        ContentType: input.mimeType,
      }),
    );

    return {
      storageDriver: "r2",
      storageKey,
      url: this.getUrl(storageKey),
      size: input.body.length,
      mimeType: input.mimeType,
      filename,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }
}
