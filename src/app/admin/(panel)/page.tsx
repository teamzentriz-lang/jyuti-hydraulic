import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { formatWhen, StatusPill } from "@/components/admin/status-pill";
import { resources, type ResourceKey } from "@/lib/cms/resources";
import { crmDashboardSummary, dashboardSummary } from "@/lib/cms/queries";
import { requireUser } from "@/lib/auth";
import { canAccessResource, hasPermission } from "@/lib/authorization";

const cards: { key: ResourceKey; hint: string }[] = [
  { key: "leads", hint: "Sales pipeline" },
  { key: "follow-ups", hint: "Pending and overdue actions" },
  { key: "contacts", hint: "Customer contacts" },
  { key: "companies", hint: "Customer organisations" },
  { key: "products", hint: "Catalogue detail pages" },
  { key: "product-categories", hint: "Nested menu groups" },
  { key: "locations", hint: "City URLs" },
  { key: "exports", hint: "Country pages" },
  { key: "posts", hint: "Root-level articles" },
  { key: "pages", hint: "About, contact, and the rest" },
  { key: "gallery", hint: "Photo grid" },
  { key: "certificates", hint: "Certificate images" },
  { key: "media", hint: "Images and the catalogue PDF" },
  { key: "inquiries", hint: "Quotes and contact form" },
  { key: "redirects", hint: "Only changed URLs" },
  { key: "nav-links", hint: "Header and footer links" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const { counts, recent } = await dashboardSummary(user);
  const visibleCards = cards.filter((card) => canAccessResource(user, card.key));
  const canViewInquiries = hasPermission(user, "inquiries.manage") || hasPermission(user, "inquiries.view");
  const canViewCrm = canViewInquiries || hasPermission(user, "crm.leads.view") || hasPermission(user, "crm.tasks.manage");
  const crm = canViewCrm ? await crmDashboardSummary(user) : null;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Jyoti Hydraulic CMS"
        description="Editors create city pages, products, posts, gallery photos, and certificates here. Layouts stay in code."
      />
      {crm ? <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4"><span className="block text-2xl font-semibold text-navy">{crm.openLeads}</span><span className="text-sm text-muted">Open leads</span></div>
        <div className="rounded-lg border border-line bg-white p-4"><span className="block text-2xl font-semibold text-navy">{crm.unassignedInquiries}</span><span className="text-sm text-muted">New unassigned enquiries</span></div>
        <div className="rounded-lg border border-line bg-white p-4"><span className="block text-2xl font-semibold text-signal">{crm.overdueFollowUps}</span><span className="text-sm text-muted">Overdue follow-ups</span></div>
      </div> : null}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link key={card.key} href={`/admin/${card.key}`} className="rounded-lg border border-line bg-white p-4 shadow-sm hover:border-navy">
            <span className="block text-2xl font-semibold text-navy">{counts[card.key] ?? 0}</span>
            <span className="mt-1 block text-sm font-semibold">{resources[card.key].label}</span>
            <span className="mt-1 block text-xs text-muted">{card.hint}</span>
          </Link>
        ))}
      </div>
      {canViewInquiries ? <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Latest inquiries</h2>
        {recent.length ? (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link href={`/admin/inquiries/${item.id}`} className="font-semibold text-navy hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {item.email} · {formatWhen(item.createdAt)}
                  </p>
                </div>
                <StatusPill value={item.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No enquiries yet. The contact form will store them here.</p>
        )}
      </section> : null}
    </>
  );
}
