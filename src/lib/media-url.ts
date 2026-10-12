/** Stable URL for browser previews (admin + public). Local files are served via the media API. */
export function mediaDeliveryUrl(item: { id: string; url: string }) {
  if (/^https?:\/\//i.test(item.url)) return item.url;
  if (item.url.startsWith("/brand/")) return item.url;
  return `/api/media/${item.id}`;
}

export function isPlaceholderMedia(item: { url: string; legacyUrl?: string | null }) {
  if (item.legacyUrl) return false;
  return item.url === "/placeholders/product.svg" || item.url.startsWith("/placeholders/");
}
