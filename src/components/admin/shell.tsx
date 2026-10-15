"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/cms/actions";
import type { SessionUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/authorization";

const groups = [
  {
    label: "Site",
    items: [
      {
        href: "/admin/settings",
        label: "Site settings",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/header",
        label: "Header",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/footer",
        label: "Footer",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/contact-settings",
        label: "Contact settings",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/common-html",
        label: "Common HTML",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/page-html",
        label: "Page HTML",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/site-labels",
        label: "Site labels",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/home",
        label: "Home page",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/products-menu",
        label: "Products menu",
        permission: "cms.navigation.manage",
      },
      {
        href: "/admin/nav-links",
        label: "Navigation",
        permission: "cms.navigation.manage",
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      {
        href: "/admin/product-categories",
        label: "Categories",
        permission: "cms.catalogue.manage",
      },
      {
        href: "/admin/products",
        label: "Products",
        permission: "cms.catalogue.manage",
      },
      {
        href: "/admin/locations",
        label: "Location pages",
        permission: "cms.pages.manage",
      },
      {
        href: "/admin/exports",
        label: "Export pages",
        permission: "cms.pages.manage",
      },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", permission: "cms.pages.manage" },
      {
        href: "/admin/posts",
        label: "Blog posts",
        permission: "cms.content.manage",
      },
      {
        href: "/admin/blog-categories",
        label: "Blog categories",
        permission: "cms.content.manage",
      },
      {
        href: "/admin/blog-tags",
        label: "Blog tags",
        permission: "cms.content.manage",
      },
      {
        href: "/admin/gallery",
        label: "Gallery photos",
        permission: "cms.content.manage",
      },
      {
        href: "/admin/gallery-albums",
        label: "Gallery albums",
        permission: "cms.content.manage",
      },
      {
        href: "/admin/certificates",
        label: "Certificates",
        permission: "cms.content.manage",
      },
      {
        href: "/admin/catalogues",
        label: "Catalogues",
        permission: "cms.content.manage",
      },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        href: "/admin/inquiries",
        label: "Enquiries",
        permission: "inquiries.view",
      },
      {
        href: "/admin/leads",
        label: "Sales leads",
        permission: "crm.leads.view",
      },
      {
        href: "/admin/follow-ups",
        label: "Follow-ups",
        permission: "crm.tasks.manage",
      },
      {
        href: "/admin/lead-activities",
        label: "Activities",
        permission: "crm.activities.manage",
      },
      {
        href: "/admin/contacts",
        label: "Customers",
        permission: "crm.customers.view",
      },
      {
        href: "/admin/companies",
        label: "Companies",
        permission: "crm.customers.view",
      },
      {
        href: "/admin/quotations",
        label: "Quotations",
        permission: "quotations.view",
      },
      {
        href: "/admin/reports",
        label: "Sales reports",
        permission: "crm.reports.view",
      },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/admin/media", label: "Media", permission: "media.manage" },
      {
        href: "/admin/forms",
        label: "Forms",
        permission: "cms.content.manage",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/redirects",
        label: "Redirects",
        permission: "cms.navigation.manage",
      },
      { href: "/admin/teams", label: "Teams", permission: "teams.manage" },
      {
        href: "/admin/users",
        label: "Users",
        permission: "users.manage",
        superAdminOnly: true,
      },
      {
        href: "/admin/audit",
        label: "Activity history",
        permission: "audit.view",
      },
      {
        href: "/admin/quotation-settings",
        label: "Quotation settings",
        permission: "users.manage",
        superAdminOnly: true,
      },
      { href: "/admin/account", label: "Your account" },
    ],
  },
];

function normalize(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = normalize(usePathname());
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const open = openPath === pathname;
  const roleLabel = user.systemRole.replace("_", " ");
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[250px_1fr]">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-navy px-4 py-3 text-white md:hidden">
        <Link href="/admin" className="font-semibold">
          Jyoti CMS
        </Link>
        <div className="flex items-center gap-2">
          <ProfileMenu
            user={user}
            initials={initials}
            roleLabel={roleLabel}
            open={profileOpen}
            onToggle={() => setProfileOpen((value) => !value)}
            compact
          />
          <button
            type="button"
            className="rounded-md border border-white/20 px-3 py-1 text-sm"
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} border-r border-white/10 bg-navy text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col`}
      >
        <div className="border-b border-white/10 px-4 py-5">
          <Link
            href="/"
            className="admin-sidebar-brand"
            aria-label="Jyoti Hydraulic home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpg" alt="Jyoti Hydraulic" />
            <span className="mt-1 block text-lg font-semibold">
              Content studio
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <Link href="/admin" className={linkClass(pathname === "/admin")}>
            Dashboard
          </Link>
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items
                  .filter(
                    (item) =>
                      (!item.permission ||
                        hasPermission(user, item.permission as Permission)) &&
                      (!item.superAdminOnly ||
                        user.systemRole === "super_admin"),
                  )
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={linkClass(
                        pathname === item.href ||
                          pathname.startsWith(`${item.href}/`),
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-between border-b border-line bg-white/95 px-8 shadow-sm backdrop-blur md:flex">
          <LiveDateTime now={now} />
          <ProfileMenu
            user={user}
            initials={initials}
            roleLabel={roleLabel}
            open={profileOpen}
            onToggle={() => setProfileOpen((value) => !value)}
          />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function linkClass(active: boolean) {
  return `block rounded-md px-2 py-1.5 text-sm ${active ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`;
}

function LiveDateTime({ now }: { now: Date | null }) {
  const date = now
    ? new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(now)
    : "Loading date…";
  const time = now
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }).format(now)
    : "--:--:--";

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden font-medium text-muted lg:block">{date}</span>
      <span className="rounded-md bg-paper px-2.5 py-1 font-semibold tabular-nums text-navy">
        {time} IST
      </span>
    </div>
  );
}

function ProfileMenu({
  user,
  initials,
  roleLabel,
  open,
  onToggle,
  compact = false,
}: {
  user: SessionUser;
  initials: string;
  roleLabel: string;
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${compact ? "hover:bg-white/10" : "hover:bg-paper"}`}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-xs font-bold text-white">
          {initials || "U"}
        </span>
        <span className={`${compact ? "hidden" : "hidden max-w-44 sm:block"}`}>
          <span className="block truncate text-sm font-semibold text-navy">
            {user.name}
          </span>
          <span className="block truncate text-xs capitalize text-muted">
            {roleLabel}
          </span>
        </span>
        <svg
          className={`h-4 w-4 transition ${compact ? "text-white/70" : "text-muted"} ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="m5 7 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-navy">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-1 text-xs font-semibold capitalize text-signal">
              {roleLabel}
            </p>
          </div>
          <Link
            href="/admin/account"
            className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-paper"
          >
            My account
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
