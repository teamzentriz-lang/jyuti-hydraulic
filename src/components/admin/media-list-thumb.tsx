import { isImageMimeType } from "@/lib/media-upload";
import { mediaDeliveryUrl } from "@/lib/media-url";

export function MediaListThumb({
  id,
  url,
  mimeType,
}: {
  id: string;
  url: string;
  mimeType: string;
  filename: string;
}) {
  if (isImageMimeType(mimeType) && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaDeliveryUrl({ id, url })} alt="" className="mr-2 inline-block h-10 w-10 rounded object-cover align-middle" />
    );
  }
  return (
    <span className="mr-2 inline-flex h-10 w-10 items-center justify-center rounded bg-paper text-[10px] font-semibold text-muted">
      {mimeType === "application/pdf" ? "PDF" : "File"}
    </span>
  );
}
