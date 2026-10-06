import type { MediaItem } from "@/lib/cms/queries";
import { mediaDeliveryUrl } from "@/lib/media-url";

export function CmsImage({
  item,
  alt,
  className,
}: {
  item: MediaItem;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaDeliveryUrl(item)} alt={alt ?? item.alt ?? item.filename} className={className} />
  );
}