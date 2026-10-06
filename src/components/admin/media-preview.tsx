import Link from "next/link";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { isImageMimeType, isPdfMimeType, isVideoMimeType } from "@/lib/media-upload";

export function MediaPreview({
  id,
  url,
  mimeType,
  filename,
  alt,
}: {
  id: string;
  url: string;
  mimeType: string;
  filename: string;
  alt?: string;
  title?: string;
}) {
  const src = mediaDeliveryUrl({ id, url });
  const label = alt || filename;

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy">Preview</p>
        <Link href={src} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-signal hover:underline">
          Open file
        </Link>
      </div>
      {isImageMimeType(mimeType) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="max-h-[min(70vh,640px)] w-full rounded-md border border-line bg-paper object-contain" />
      ) : isVideoMimeType(mimeType) ? (
        <video src={src} controls playsInline className="max-h-[min(70vh,640px)] w-full rounded-md border border-line bg-black" />
      ) : isPdfMimeType(mimeType) ? (
        <iframe title={label} src={src} className="h-[min(70vh,720px)] w-full rounded-md border border-line bg-paper" />
      ) : (
        <p className="text-sm text-muted">
          {mimeType} — use <strong>Open file</strong> to download.
        </p>
      )}
    </div>
  );
}
