"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CmsImage } from "@/components/site/cms-image";
import type { MediaItem } from "@/lib/cms/queries";
import type { NavItem } from "@/lib/cms/site";
import { isProductsNavItem } from "@/lib/cms/product-nav";
import { publicPath } from "@/lib/paths";

function NavAnchor({
  item,
  className,
  onClick,
}: {
  item: NavItem;
  className: string;
  onClick?: () => void;
}) {
  if (/^https?:\/\//i.test(item.href)) {
    return (
      <a
        href={item.href}
        className={className}
        target={item.openInNewTab ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onClick}>
      {item.label}
    </Link>
  );
}

function MenuChevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-muted"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className ?? "shrink-0 opacity-80"}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function flattenProductsMenu(items: NavItem[]) {
  const rows = items.flatMap((item) =>
    /^products$/i.test(item.label.trim()) && item.children.length ? item.children : [item],
  );
  const byHref = new Map<string, NavItem>();
  const order: string[] = [];
  for (const item of rows) {
    const key = item.href.replace(/\/+$/, "") || "/";
    const existing = byHref.get(key);
    if (!existing) {
      byHref.set(key, item);
      order.push(key);
      continue;
    }
    if (item.children.length > existing.children.length) byHref.set(key, item);
  }
  return order.map((key) => byHref.get(key)!);
}

function ProductsPrimaryMenu({ items }: { items: NavItem[] }) {
  const menuItems = flattenProductsMenu(items);
  const [path, setPath] = useState<string[]>([]);
  const columns: NavItem[][] = [menuItems];
  let current = menuItems;
  for (const id of path) {
    const next = current.find((item) => item.id === id);
    if (!next?.children.length) break;
    columns.push(next.children);
    current = next.children;
  }

  return (
    <div className="products-flyout" onMouseLeave={() => setPath([])}>
      {columns.map((column, index) => (
        <ul key={`${index}-${column[0]?.id ?? "col"}`} className="products-flyout__list">
          {column.map((item) => {
            const open = path[index] === item.id;
            return (
              <li
                key={item.id}
                className={open ? "products-flyout__item is-active" : "products-flyout__item"}
                onMouseEnter={() =>
                  setPath((currentPath) => {
                    const next = currentPath.slice(0, index);
                    if (item.children.length) next.push(item.id);
                    return next;
                  })
                }
                onFocus={() =>
                  setPath((currentPath) => {
                    const next = currentPath.slice(0, index);
                    if (item.children.length) next.push(item.id);
                    return next;
                  })
                }
              >
                <NavAnchor item={item} className="products-flyout__anchor" />
                {item.children.length ? <MenuChevron /> : null}
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

function CascadeMenuPanel({
  items,
  depth = 0,
}: {
  items: NavItem[];
  depth?: number;
}) {
  return (
    <ul
      className={
        depth === 0
          ? "max-h-[min(70vh,560px)] min-w-[17rem] overflow-y-auto py-1"
          : "max-h-[min(70vh,480px)] min-w-[16rem] overflow-y-auto py-1"
      }
    >
      {items.map((item) => (
        <li key={item.id} className="group/sub relative">
          <div className="flex items-center gap-1 pr-2">
            <NavAnchor
              item={item}
              className="block flex-1 px-4 py-2.5 text-sm text-navy hover:bg-paper hover:underline"
            />
            {item.children.length ? <MenuChevron /> : null}
          </div>
          {item.children.length ? (
            <div className="invisible absolute left-full top-0 z-50 opacity-0 transition duration-150 group-hover/sub:visible group-hover/sub:opacity-100 group-focus-within/sub:visible group-focus-within/sub:opacity-100">
              <div className="ml-0 rounded-lg border border-line bg-white shadow-xl">
                <CascadeMenuPanel items={item.children} depth={depth + 1} />
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MegaMenuPanel({ item }: { item: NavItem }) {
  if (!item.children.length) return null;
  const hasNestedChildren = item.children.some(
    (child) => child.children.length > 0,
  );
  const useProductsMenu = isProductsNavItem(item);
  const useCascade = !useProductsMenu && hasNestedChildren;

  return (
    <div className="invisible absolute left-0 top-full z-40 pt-1 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      <div
        className={
          useProductsMenu
            ? "rounded-b-lg border border-line bg-white shadow-xl"
            : "overflow-hidden rounded-b-lg border border-line bg-white shadow-xl"
        }
      >
        {useProductsMenu ? (
          <ProductsPrimaryMenu items={item.children} />
        ) : useCascade ? (
          <CascadeMenuPanel items={item.children} />
        ) : (
          <ul className="max-h-[70vh] min-w-[14rem] overflow-y-auto py-2">
            {item.children.map((child) => (
              <li key={child.id}>
                <NavAnchor
                  item={child}
                  className="block px-4 py-2 text-sm text-navy hover:bg-paper hover:underline"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MobileNavBranch({
  items,
  depth = 0,
  onNavigate,
}: {
  items: NavItem[];
  depth?: number;
  onNavigate: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className={depth === 0 ? "app-nav" : "app-nav app-nav--nested"}>
      {items.map((item) => {
        const expanded = openId === item.id;
        return (
          <li key={item.id}>
            <div className="app-nav__row">
              <NavAnchor item={item} className="app-nav__link" onClick={onNavigate} />
              {item.children.length ? (
                <button
                  type="button"
                  className="app-nav__toggle"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Hide" : "Show"} ${item.label}`}
                  onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
                >
                  <MenuChevronDown className={expanded ? "app-nav__chevron is-open" : "app-nav__chevron"} />
                </button>
              ) : null}
            </div>
            {item.children.length && expanded ? (
              <MobileNavBranch items={item.children} depth={depth + 1} onNavigate={onNavigate} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TabIcon({ name }: { name: "home" | "grid" | "image" | "mail" | "menu" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "grid") {
    return (
      <svg {...common}>
        <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "image") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7 15 2.5-2.5L13 16l2-2 2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="m5 8 7 5 7-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader({
  companyName,
  logo,
  mobileLogo,
  nav,
  phone,
  quoteLabel,
  quoteHref,
  sticky,
}: {
  companyName: string;
  logo: MediaItem | null;
  mobileLogo: MediaItem | null;
  nav: NavItem[];
  phone: string;
  quoteLabel: string;
  quoteHref: string;
  sticky: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const brandLogo = logo ?? mobileLogo;
  const current = pathname.replace(/\/$/, "") || "/";
  const closeMenu = () => setOpen(false);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`z-30 border-b border-line bg-white text-navy shadow-sm ${sticky ? "sticky top-0" : ""}`}
    >
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 lg:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          onClick={() => setOpen(false)}
        >
          {brandLogo ? (
            <CmsImage
              item={brandLogo}
              alt={companyName}
              className="h-11 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <span className="text-xl font-extrabold tracking-tight lg:text-2xl">
              {companyName}
            </span>
          )}
        </Link>

        <nav className="hidden flex-1 justify-center lg:flex" aria-label="Main">
          <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
            {nav.map((item) => (
              <li key={item.id} className="group relative">
                <div className="inline-flex items-center gap-0.5 px-3 py-2">
                  <NavAnchor
                    item={item}
                    className="desktop-nav-link text-sm font-semibold text-navy/80 transition hover:text-signal group-hover:text-signal"
                  />
                  {item.children.length ? <MenuChevronDown /> : null}
                </div>
                {item.children.length ? <MegaMenuPanel item={item} /> : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {phone ? (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="header-call">
              <span className="header-call__icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7.5 3.8c.4-.4 1-.5 1.5-.2l2.1 1.2c.5.3.8.9.7 1.5l-.4 2.2a1.4 1.4 0 0 1-.8 1l-1.2.6a9.6 9.6 0 0 0 4.8 4.8l.6-1.2c.2-.4.6-.7 1-.8l2.2-.4c.6-.1 1.2.2 1.5.7l1.2 2.1c.3.5.2 1.1-.2 1.5l-1.4 1.4c-.4.4-1 .6-1.6.5C10.2 18.4 5.6 13.8 4.3 7.4c-.1-.6.1-1.2.5-1.6L7.5 3.8Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>
                <span className="header-call__label">Call Anytime</span>
                <strong>{phone}</strong>
              </span>
            </a>
          ) : null}
          <Link
            href={publicPath(quoteHref)}
            className="rounded-md bg-signal px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#e45a0a]"
          >
            {quoteLabel}
          </Link>
        </div>

        <nav className="mobile-links lg:hidden" aria-label="Sections">
          {(
            [
              ["/", "Home"],
              ["/products/", "Products"],
              ["/gallery/", "Gallery"],
              ["/contact/", "Contact"],
            ] as const
          ).map(([href, label]) => {
            const key = href === "/" ? "/" : href.replace(/\/$/, "");
            const active = href === "/" ? current === "/" : current === key || current.startsWith(`${key}/`);
            return (
              <Link key={href} href={href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="header-menu inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line text-navy lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          {open ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="mobile-drawer lg:hidden">
          <form className="mobile-drawer__search" action="/products/" method="get">
            <input name="q" placeholder="Search products..." aria-label="Search products" suppressHydrationWarning />
          </form>
          <MobileNavBranch items={nav} onNavigate={closeMenu} />
          <div className="mobile-drawer__foot">
            {phone ? (
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="mobile-drawer__phone">
                {phone}
              </a>
            ) : null}
            <Link
              href={publicPath(quoteHref)}
              className="site-btn-primary"
              onClick={closeMenu}
            >
              {quoteLabel}
            </Link>
          </div>
        </div>
      ) : null}
      <nav className="app-tabbar lg:hidden" aria-label="App">
        {(
          [
            ["/", "Home", "home"],
            ["/products/", "Products", "grid"],
            ["/gallery/", "Gallery", "image"],
            ["/contact/", "Contact", "mail"],
          ] as const
        ).map(([href, label, icon]) => {
          const key = href === "/" ? "/" : href.replace(/\/$/, "");
          const active = href === "/" ? current === "/" : current === key || current.startsWith(`${key}/`);
          return (
            <Link key={href} href={href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
              <TabIcon name={icon} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button type="button" className={open ? "is-active" : ""} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <TabIcon name="menu" />
          <span>Menu</span>
        </button>
      </nav>
    </header>
  );
}
