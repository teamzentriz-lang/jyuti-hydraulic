/** Stable URL for browser previews (admin + public). Local files are served via the media API. */
export function mediaDeliveryUrl(item: { id: string; url: string; legacyUrl?: string | null }) {
  if (/^https?:\/\//i.test(item.url)) return item.url;
  if (item.url.startsWith("/brand/")) return item.url;
  // Imported media may still have a working legacy URL when the copied
  // object is missing from the current deployment's storage provider.
  if (item.legacyUrl && /^https?:\/\//i.test(item.legacyUrl)) return item.legacyUrl;
  return `/api/media/${item.id}`;
}

export function isPlaceholderMedia(item: { url: string; legacyUrl?: string | null }) {
  if (item.legacyUrl) return false;
  return item.url === "/placeholders/product.svg" || item.url.startsWith("/placeholders/");
}
