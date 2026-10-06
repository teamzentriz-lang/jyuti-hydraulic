import type { MediaItem } from "@/lib/cms/queries";
import { isImageMimeType, isVideoMimeType } from "@/lib/media-upload";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { CmsImage } from "@/components/site/cms-image";
export function CmsMedia({
  item,
  alt,
  className,
  videoClassName,
  controls = true,
}: {
  item: MediaItem;
  alt?: string;
  className?: string;
  videoClassName?: string;
  controls?: boolean;
}) {
  if (isVideoMimeType(item.mimeType) && item.url) {
    return (
      <video
        src={mediaDeliveryUrl(item)}        className={videoClassName ?? className}
        controls={controls}
        playsInline
        preload="metadata"
        aria-label={alt ?? item.alt ?? item.filename}
      />
    );
  }

  if (isImageMimeType(item.mimeType) && item.url) {
    return <CmsImage item={item} alt={alt} className={className} />;
  }

  return (
    <div className={className} role="img" aria-label={alt ?? item.filename}>
      <span className="flex h-full min-h-[8rem] items-center justify-center rounded-lg bg-paper text-sm font-semibold text-muted">
        {item.mimeType === "application/pdf" ? "PDF" : "File"}
      </span>
    </div>
  );
}
