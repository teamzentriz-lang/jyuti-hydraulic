import Link from "next/link";
import { getSiteLabels } from "@/lib/cms/queries";

export default async function NotFound() {
  const labels = await getSiteLabels();
  return (
    <main className="site-container missing-page">
      <p className="eyebrow dark">404</p>
      <h1>{labels.notFoundTitle}</h1>
      <p>{labels.notFoundDescription}</p>
      <div className="missing-page__actions">
        <Link href="/" className="site-btn-outline">
          {labels.notFoundHomeLabel}
        </Link>
        <Link href="/products/" className="site-btn-primary">
          {labels.notFoundProductsLabel}
        </Link>
        <Link href="/contact/" className="site-btn-outline">
          {labels.notFoundContactLabel}
        </Link>
      </div>
    </main>
  );
}
