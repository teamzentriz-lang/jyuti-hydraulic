import Link from "next/link";
import { publicPath } from "@/lib/paths";

export function ProductCard({
  title,
  path,
  summary,
  imageUrl,
  imageAlt,
}: {
  title: string;
  path: string;
  summary?: string;
  imageUrl?: string | null;
  imageAlt?: string;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden border border-line bg-white shadow-sm transition hover:shadow-md">
      <div className="aspect-[4/3] overflow-hidden bg-paper">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt || title} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-navy">{title}</h3>
        {summary ? <p className="mt-2 flex-1 text-sm leading-6 text-muted">{summary}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={publicPath(path)} className="site-btn-outline">
            Read more
          </Link>
          <Link href="/contact/" className="site-btn-primary">
            Contact us
          </Link>
        </div>
      </div>
    </article>
  );
}
