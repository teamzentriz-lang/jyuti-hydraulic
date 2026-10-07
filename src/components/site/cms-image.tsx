"use client";

import { useState } from "react";
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
  const [failed, setFailed] = useState(false);
  const label = alt || item.alt || item.filename || "Jyoti Hydraulic";

  if (failed) {
    return (
      <span className={`media-fallback ${className ?? ""}`} role="img" aria-label={label}>
        <strong>Jyoti</strong>
        <small>Hydraulic</small>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaDeliveryUrl(item)}
      alt={label}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
