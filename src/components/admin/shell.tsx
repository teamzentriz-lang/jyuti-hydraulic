"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/cms/actions";
import type { SessionUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/authorization";

const groups = [
  {
    label: "Site",
    items: [
      { href: "/admin/settings", label: "Site settings", permission: "cms.settings.manage" },
      { href: "/admin/header", label: "Header", permission: "cms.settings.manage" },
      { href: "/admin/footer", label: "Footer", permission: "cms.settings.manage" },
      { href: "/admin/contact-settings", label: "Contact settings", permission: "cms.settings.manage" },
      { href: "/admin/home", label: "Home page", permission: "cms.settings.manage" },
      { href: "/admin/products-menu", label: "Products menu", permission: "cms.navigation.manage" },
      { href: "/admin/nav-links", label: "Navigation", permission: "cms.navigation.manage" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/product-categories", label: "Categories", permission: "cms.catalogue.manage" },
      { href: "/admin/products", label: "Products", permission: "cms.catalogue.manage" },
      { href: "/admin/locations", label: "Location pages", permission: "cms.pages.manage" },
      { href: "/admin/exports", label: "Export pages", permission: "cms.pages.manage" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", permission: "cms.pages.manage" },
      { href: "/admin/posts", label: "Blog posts", permission: "cms.content.manage" },
      { href: "/admin/blog-categories", label: "Blog categories", permission: "cms.content.manage" },
      { href: "/admin/blog-tags", label: "Blog tags", permission: "cms.content.manage" },
      { href: "/admin/gallery", label: "Gallery photos", permission: "cms.content.manage" },
      { href: "/admin/gallery-albums", label: "Gallery albums", permission: "cms.content.manage" },
      { href: "/admin/certificates", label: "Certificates", permission: "cms.content.manage" },
      { href: "/admin/catalogues", label: "Catalogues", permission: "cms.content.manage" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/admin/inquiries", label: "Enquiries", permission: "inquiries.view" },
      { href: "/admin/leads", label: "Sales leads", permission: "crm.leads.view" },
      { href: "/admin/follow-ups", label: "Follow-ups", permission: "crm.tasks.manage" },
      { href: "/admin/lead-activities", label: "Activities", permission: "crm.activities.manage" },
      { href: "/admin/contacts", label: "Customers", permission: "crm.customers.view" },
      { href: "/admin/companies", label: "Companies", permission: "crm.customers.view" },
      { href: "/admin/quotations", label: "Quotations", permission: "quotations.view" },
      { href: "/admin/reports", label: "Sales reports", permission: "crm.reports.view" },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/admin/media", label: "Media", permission: "media.manage" },
      { href: "/admin/forms", label: "Forms", permission: "cms.content.manage" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/redirects", label: "Redirects", permission: "cms.navigation.manage" },
      { href: "/admin/teams", label: "Teams", permission: "teams.manage" },
      { href: "/admin/users", label: "Users", permission: "users.manage", superAdminOnly: true },
      { href: "/admin/audit", label: "Activity history", permission: "audit.view" },
      { href: "/admin/quotation-settings", label: "Quotation settings", permission: "users.manage", superAdminOnly: true },
      { href: "/admin/account", label: "Your account" },
    ],
  },
];

function normalize(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = normalize(usePathname());
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[250px_1fr]">
      <div className="flex items-center justify-between border-b border-white/10 bg-navy px-4 py-3 text-white md:hidden">
        <Link href="/admin" className="font-semibold">
          Jyoti CMS
        </Link>
        <button type="button" className="rounded-md border border-white/20 px-3 py-1 text-sm" onClick={() => setOpenPath(open ? null : pathname)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <aside className={`${open ? "block" : "hidden"} border-r border-white/10 bg-navy text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col`}>
        <div className="border-b border-white/10 px-4 py-5">
          <Link href="/" className="admin-sidebar-brand" aria-label="Jyoti Hydraulic home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpg" alt="Jyoti Hydraulic" />
            <span className="mt-1 block text-lg font-semibold">Content studio</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <Link href="/admin" className={linkClass(pathname === "/admin")}>
            Dashboard
          </Link>
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{group.label}</p>
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => (!item.permission || hasPermission(user, item.permission as Permission)) && (!item.superAdminOnly || user.systemRole === "super_admin"))
                  .map((item) => (
                    <Link key={item.href} href={item.href} className={linkClass(pathname === item.href || pathname.startsWith(`${item.href}/`))}>
                      {item.label}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-white/60">{user.systemRole.replace("_", " ")}</p>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="text-sm font-semibold text-red-200 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function linkClass(active: boolean) {
  return `block rounded-md px-2 py-1.5 text-sm ${active ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`;
}
