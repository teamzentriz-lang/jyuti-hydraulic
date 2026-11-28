import Link from "next/link";
import { cleanPublicExcerpt } from "@/lib/cms/clean-copy";
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
    <article className="product-card">
      <Link
        href={publicPath(path)}
        className="product-card__image"
        aria-label={title}
        prefetch={false}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/placeholders/product.svg"}
          alt={imageAlt || title}
        />
      </Link>
      <div className="product-card__body">
        <h3>
          <Link href={publicPath(path)} prefetch={false}>{title}</Link>
        </h3>
        {summary && cleanPublicExcerpt(summary, 180) ? (
          <p>{cleanPublicExcerpt(summary, 180)}</p>
        ) : null}
        <Link href={publicPath(path)} className="product-card__link" prefetch={false}>
          View product <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
