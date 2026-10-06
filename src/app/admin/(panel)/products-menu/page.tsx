import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Notice, PageHeader } from "@/components/admin/page-header";
import { secondaryButtonClass } from "@/components/admin/styles";
import { getDb } from "@/db";
import { navLinks } from "@/db/schema";

export default async function ProductsMenuPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  const db = getDb();
  const rows = await db
    .select({
      id: navLinks.id,
      label: navLinks.label,
      href: navLinks.href,
      sortOrder: navLinks.sortOrder,
      isActive: navLinks.isActive,
      parentId: navLinks.parentId,
    })
    .from(navLinks)
    .where(eq(navLinks.location, "products"))
    .orderBy(asc(navLinks.sortOrder), asc(navLinks.label));

  const topLevel = rows.filter((row) => !row.parentId);
  const nestedCount = rows.length - topLevel.length;

  return (
    <>
      <PageHeader
        eyebrow="Site"
        title="Products menu"
        description="These links appear in the header dropdown when visitors hover Products. Order and labels here match the live site."
        action={
          <Link href="/admin/nav-links/new?location=products" className={secondaryButtonClass}>
            Add menu item
          </Link>
        }
      />
      {params.saved ? <Notice tone="ok">Menu link saved.</Notice> : null}
      {!topLevel.length ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          No dedicated Products menu items yet. The site uses sub-links under the header &quot;Products&quot; link in{" "}
          <Link href="/admin/nav-links" className="font-semibold underline">
            Navigation
          </Link>
          , or published top-level categories if those are empty.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Order</th>
              <th className="px-3 py-2 font-semibold">Label</th>
              <th className="px-3 py-2 font-semibold">URL</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {topLevel.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-muted">{row.sortOrder}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/nav-links/${row.id}`} className="font-semibold text-navy hover:underline">
                    {row.label}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{row.href}</td>
                <td className="px-3 py-2">{row.isActive ? "Active" : "Hidden"}</td>
              </tr>
            ))}
            {!topLevel.length ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-muted">
                  Add items with menu set to &quot;Products menu&quot; to manage this list in one place.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {nestedCount > 0 ? (
        <p className="mt-3 text-sm text-muted">
          {nestedCount} nested item(s) use a parent link — edit them from{" "}
          <Link href="/admin/nav-links?q=products" className="font-semibold text-navy hover:underline">
            Navigation
          </Link>
          .
        </p>
      ) : null}
      <section className="mt-8 rounded-lg border border-line bg-paper p-4 text-sm text-ink">
        <h2 className="font-semibold text-navy">How this works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>
            <strong className="text-navy">Products menu</strong> links (this page) are used first.
          </li>
          <li>
            If none exist, sub-links under <strong className="text-navy">Products</strong> in the header navigation are
            used.
          </li>
          <li>
            Sub-items for each line can come from nested menu links or from the catalogue when the URL matches a
            category.
          </li>
        </ul>
      </section>
    </>
  );
}
