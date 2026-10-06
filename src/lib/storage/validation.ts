import path from "path";
import { CmsError } from "@/db/errors";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXTENSION_BY_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/svg+xml": [".svg"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_PDF = 80 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;
const MAX_DOCUMENT = 80 * 1024 * 1024;

export function assertUpload(file: File) {
  if (!file || file.size === 0) throw new CmsError("Choose a file to upload.");
  validateUploadBytes(file.name, file.type, file.size);
}

export function validateUploadBytes(originalName: string, mimeType: string, size: number) {
  const isPdf = mimeType === "application/pdf";
  const isImage = IMAGE_TYPES.has(mimeType);
  const isVideo = VIDEO_TYPES.has(mimeType);
  const isDocument = DOCUMENT_TYPES.has(mimeType);

  if (!isPdf && !isImage && !isVideo && !isDocument) {
    throw new CmsError(
      "Upload a JPEG, PNG, WebP, GIF, SVG, PDF, Word, Excel, MP4, WebM, or MOV file.",
    );
  }

  const ext = path.extname(originalName).toLowerCase();
  const allowedExts = EXTENSION_BY_MIME[mimeType];
  if (allowedExts && ext && !allowedExts.includes(ext)) {
    throw new CmsError("File extension does not match the file type.");
  }

  if (isImage && size > MAX_IMAGE) throw new CmsError("Images must be 15 MB or smaller.");
  if (isPdf && size > MAX_PDF) throw new CmsError("PDFs must be 80 MB or smaller.");
  if (isVideo && size > MAX_VIDEO) throw new CmsError("Videos must be 100 MB or smaller.");
  if (isDocument && !isPdf && size > MAX_DOCUMENT) {
    throw new CmsError("Documents must be 80 MB or smaller.");
  }
}

export function assertUploadBuffer(input: { originalName: string; mimeType: string; size: number }) {
  validateUploadBytes(input.originalName, input.mimeType, input.size);
}
