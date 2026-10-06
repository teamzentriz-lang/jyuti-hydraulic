/** Shared accept list for admin upload inputs (images, PDF, common video formats). */
export const ADMIN_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/mp4,video/webm,video/quicktime";

export function isVideoMimeType(mimeType: string) {
  return mimeType.startsWith("video/");
}

export function isImageMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function isPdfMimeType(mimeType: string) {
  return mimeType === "application/pdf";
}
