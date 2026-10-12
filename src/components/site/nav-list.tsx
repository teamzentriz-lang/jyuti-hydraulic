import Link from "next/link";
import { cleanPublicTitle } from "@/lib/cms/clean-copy";
import type { NavItem } from "@/lib/cms/site";

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function NavLink({
  item,
  variant,
}: {
  item: NavItem;
  variant: "header" | "footer" | "default";
}) {
  const className =
    variant === "header"
      ? "hover:text-white hover:underline"
      : variant === "footer"
        ? "text-white/90 hover:underline"
        : "hover:underline";
  if (isExternal(item.href)) {
    return (
      <a
        href={item.href}
        className={className}
        target={item.openInNewTab ? "_blank" : undefined}
        rel="noopener noreferrer"
      >
        {cleanPublicTitle(item.label)}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} prefetch={false}>
      {cleanPublicTitle(item.label)}
    </Link>
  );
}

export function NavList({
  items,
  className,
  variant = "default",
}: {
  items: NavItem[];
  className?: string;
  variant?: "header" | "footer" | "default";
}) {
  if (!items.length) return null;

  if (variant === "header") {
    return (
      <nav aria-label="Main">
        <ul className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-white/95">
          {items.map((item) => (
            <li key={item.id} className="group relative">
              <NavLink item={item} variant="header" />
              {item.children.length ? (
                <div className="invisible absolute left-0 top-full z-30 min-w-[14rem] pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <ul className="max-h-[70vh] overflow-y-auto rounded-md border border-line bg-white py-2 text-ink shadow-lg">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={child.href}
                          className="block px-4 py-2 text-sm text-navy hover:bg-paper hover:underline"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <ul className={className ?? "flex flex-wrap gap-x-5 gap-y-2 text-sm"}>
      {items.map((item) => (
        <li key={item.id}>
          <NavLink item={item} variant={variant} />
          {item.children.length ? (
            <ul className="mt-2 space-y-1 border-l border-white/20 pl-3 text-white/85">
              {item.children.map((child) => (
                <li key={child.id}>
                  <NavLink item={child} variant={variant} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
