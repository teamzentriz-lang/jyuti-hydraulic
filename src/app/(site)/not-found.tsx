import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-container missing-page">
      <p className="eyebrow dark">404</p>
      <h1>This page is not available</h1>
      <p>
        The link may be out of date. Browse the product range, or send a quote
        request and the team will point you to the right machine.
      </p>
      <div className="missing-page__actions">
        <Link href="/" className="site-btn-outline">
          Home
        </Link>
        <Link href="/products/" className="site-btn-primary">
          Products
        </Link>
        <Link href="/contact/" className="site-btn-outline">
          Contact
        </Link>
      </div>
    </main>
  );
}
