import Link from "next/link";
import { cleanPublicExcerpt, cleanPublicTitle } from "@/lib/cms/clean-copy";
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
  const label = cleanPublicTitle(title);
  return (
    <article className="product-card">
      <Link
        href={publicPath(path)}
        className="product-card__image"
        aria-label={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/placeholders/product.svg"}
          alt={imageUrl ? imageAlt || label : ""}
        />
      </Link>
      <div className="product-card__body">
        <h3>
          <Link href={publicPath(path)}>{label}</Link>
        </h3>
        {summary && cleanPublicExcerpt(summary, 180) ? (
          <p>{cleanPublicExcerpt(summary, 180)}</p>
        ) : null}
        <Link href={publicPath(path)} className="product-card__link">
          View product <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
