"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/lib/cms/actions";
import type { SessionUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/authorization";
import { PushNotificationControl } from "@/components/admin/push-notification-control";
import { PwaInstallControl } from "@/components/site/pwa-install-control";

type AdminLink = {
  href: string;
  label: string;
  permission?: string;
  superAdminOnly?: boolean;
};

type AdminGroup = { label: string; items: AdminLink[] };

const groups: AdminGroup[] = [
  {
    label: "Site",
    items: [
      {
        href: "/admin/home",
        label: "Home page",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/settings",
        label: "Business profile",
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
        label: "Contact page",
        permission: "cms.settings.manage",
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
        href: "/admin/site-labels",
        label: "Site labels",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/products-menu",
        label: "Products menu",
        permission: "cms.navigation.manage",
      },
      {
        href: "/admin/common-html",
        label: "Global custom HTML",
        permission: "cms.settings.manage",
      },
      {
        href: "/admin/page-html",
        label: "Page custom HTML",
        permission: "cms.settings.manage",
      },
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

const searchAliases: Record<string, string> = {
  "/admin/settings":
    "site identity seo metadata title description keywords social sharing og open graph canonical",
  "/admin/header":
    "favicon site icon browser icon header logo mobile logo top bar navigation menu phone quote button",
  "/admin/footer": "site footer copyright social links newsletter quick links",
  "/admin/contact-settings":
    "contact email address phone whatsapp map business hours enquiry recipient",
  "/admin/common-html": "global html common header footer script code banner",
  "/admin/page-html": "page specific html header footer custom code script",
  "/admin/site-labels": "button text labels heading wording interface copy",
  "/admin/home": "homepage hero banner sections client logos testimonials",
  "/admin/products":
    "product overview specifications features videos catalogue",
  "/admin/nav-links": "navigation links menus url",
  "/admin/media": "images files uploads photos documents",
  "/admin/pages": "static pages seo content editor",
  "/admin/posts": "blogs articles news seo",
  "/admin/users": "admin staff user login password permissions role",
  "/admin/teams": "teams staff access permission roles",
  "/admin/quotation-settings": "quotation company details pdf terms",
};

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
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = groups.find((group) =>
      group.items.some(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    );
    return new Set([active?.label ?? "Site"]);
  });
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
  const quickSearchItems = [
    { href: "/admin", label: "Dashboard", group: "Overview" },
    ...groups.flatMap((group) =>
      group.items
        .filter(
          (item) =>
            (!item.permission ||
              hasPermission(user, item.permission as Permission)) &&
            (!item.superAdminOnly || user.systemRole === "super_admin"),
        )
        .map((item) => ({ ...item, group: group.label })),
    ),
  ];

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
          <PwaInstallControl compact />
          <PushNotificationControl compact />
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
          {groups.map((group) => {
            const expanded = openGroups.has(group.label);
            const accessibleItems = group.items.filter(
              (item) =>
                (!item.permission ||
                  hasPermission(user, item.permission as Permission)) &&
                (!item.superAdminOnly || user.systemRole === "super_admin"),
            );
            if (!accessibleItems.length) return null;
            return (
            <div key={group.label} className="rounded-md border border-white/5 bg-white/[0.02]">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60 hover:text-white"
                aria-expanded={expanded}
                onClick={() =>
                  setOpenGroups((current) => {
                    const next = new Set(current);
                    if (next.has(group.label)) next.delete(group.label);
                    else next.add(group.label);
                    return next;
                  })
                }
              >
                <span>{group.label}</span>
                <span className={`text-sm transition ${expanded ? "rotate-180" : ""}`} aria-hidden>⌄</span>
              </button>
              {expanded ? <div className="space-y-0.5 px-1 pb-1">
                {accessibleItems.map((item) => (
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
              </div> : null}
            </div>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-between border-b border-line bg-white/95 px-8 shadow-sm backdrop-blur md:flex">
          <div className="flex min-w-0 items-center gap-5">
            <LiveDateTime now={now} />
            <AdminQuickSearch items={quickSearchItems} />
          </div>
          <div className="flex items-center gap-3">
            <PwaInstallControl />
            <PushNotificationControl />
            <ProfileMenu
              user={user}
              initials={initials}
              roleLabel={roleLabel}
              open={profileOpen}
              onToggle={() => setProfileOpen((value) => !value)}
            />
          </div>
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

function AdminQuickSearch({
  items,
}: {
  items: Array<AdminLink & { group: string }>;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = items
    .filter((item) => {
      const searchable =
        `${item.label} ${item.group} ${searchAliases[item.href] ?? ""}`.toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    })
    .slice(0, 8);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointer);
  }, []);

  return (
    <div ref={searchRef} className="relative w-[min(38vw,430px)]">
      <label className="sr-only" htmlFor="admin-quick-search">
        Search admin controls
      </label>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <circle
          cx="8.5"
          cy="8.5"
          r="5.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m13 13 4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <input
        ref={inputRef}
        id="admin-quick-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Search settings, pages, products…"
        className="h-10 w-full rounded-lg border border-line bg-paper pl-9 pr-12 text-sm text-ink outline-none transition placeholder:text-muted focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted">
        Ctrl K
      </kbd>
      {isOpen ? (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-xl">
          {matches.length ? (
            matches.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                }}
                className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-paper"
              >
                <span>
                  <span className="block text-sm font-semibold text-navy">
                    {item.label}
                  </span>
                  <span className="block text-xs text-muted">{item.group}</span>
                </span>
                <span className="text-xs text-muted">Open</span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted">
              No accessible admin control found.
            </p>
          )}
        </div>
      ) : null}
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
