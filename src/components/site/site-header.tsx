"use client";

import Link from "next/link";
import { useState } from "react";
import { CmsImage } from "@/components/site/cms-image";
import type { MediaItem } from "@/lib/cms/queries";
import type { NavItem } from "@/lib/cms/site";
import { isProductsNavItem } from "@/lib/cms/product-nav";
import { publicPath } from "@/lib/paths";

function NavAnchor({ item, className }: { item: NavItem; className: string }) {
  if (/^https?:\/\//i.test(item.href)) {
    return (
      <a
        href={item.href}
        className={className}
        target={item.openInNewTab ? "_blank" : undefined}
        rel="noopener noreferrer"
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

function MenuChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-muted">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductsPrimaryMenu({ items }: { items: NavItem[] }) {
  return (
    <ul className="max-h-[min(70vh,560px)] min-w-[17rem] max-w-[26rem] overflow-y-auto py-2" role="menu">
      {items.map((item) => (
        <li key={item.id} role="none">
          <div className="flex items-start gap-2 px-4 py-2.5 pr-3">
            <NavAnchor item={item} className="flex-1 text-sm font-medium leading-snug text-navy hover:underline" />
            {item.children.length ? (
              <MenuChevronDown className="mt-0.5 shrink-0 text-muted" />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CascadeMenuPanel({ items, depth = 0 }: { items: NavItem[]; depth?: number }) {
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
  const hasNestedChildren = item.children.some((child) => child.children.length > 0);
  const useProductsMenu = isProductsNavItem(item);
  const useCascade = !useProductsMenu && hasNestedChildren;

  return (
    <div className="invisible absolute left-0 top-full z-40 pt-1 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      <div className="overflow-hidden rounded-b-lg border border-line bg-white shadow-xl">
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

function MobileNavBranch({ items, depth = 0 }: { items: NavItem[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? "space-y-1" : "ml-3 mt-1 space-y-1 border-l border-white/20 pl-3"}>
      {items.map((item) => (
        <li key={item.id}>
          <NavAnchor
            item={item}
            className={
              depth === 0
                ? "block rounded-md px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                : depth === 1
                  ? "block py-1.5 text-sm text-white/90 hover:underline"
                  : "block py-1 text-xs text-white/80 hover:underline"
            }
          />
          {item.children.length ? <MobileNavBranch items={item.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
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
  const brandLogo = logo ?? mobileLogo;

  return (
    <header className={`z-30 border-b border-navy-2 bg-navy text-white shadow-md ${sticky ? "sticky top-0" : ""}`}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setOpen(false)}>
          {brandLogo ? (
            <CmsImage item={brandLogo} alt={companyName} className="h-11 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="text-lg font-semibold tracking-tight lg:text-xl">{companyName}</span>
          )}
        </Link>

        <nav className="hidden flex-1 justify-center lg:flex" aria-label="Main">
          <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
            {nav.map((item) => (
              <li key={item.id} className="group relative">
                <div className="inline-flex items-center gap-0.5 px-3 py-2">
                  <NavAnchor
                    item={item}
                    className="text-sm font-medium text-white/95 hover:text-white group-hover:text-white"
                  />
                  {item.children.length ? <MenuChevronDown /> : null}
                </div>
                {item.children.length ? <MegaMenuPanel item={item} /> : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="text-sm font-semibold text-white/95 hover:text-white hover:underline"
            >
              Call anytime
            </a>
          ) : null}
          <Link
            href={publicPath(quoteHref)}
            className="rounded-sm bg-signal px-4 py-2 text-sm font-semibold text-white hover:bg-[#b9151b]"
          >
            {quoteLabel}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/25 text-white lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="max-h-[70vh] overflow-y-auto border-t border-white/15 bg-navy-2 px-4 py-4 lg:hidden">
          <MobileNavBranch items={nav} />
          <div className="mt-4 flex flex-col gap-2 border-t border-white/15 pt-4">
            {phone ? (
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-sm font-semibold text-white">
                {phone}
              </a>
            ) : null}
            <Link
              href={publicPath(quoteHref)}
              className="inline-flex justify-center rounded-sm bg-signal px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              {quoteLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
