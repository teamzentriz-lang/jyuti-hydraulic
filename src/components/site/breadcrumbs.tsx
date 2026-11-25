import Link from "next/link";
import { cleanPublicTitle } from "@/lib/cms/clean-copy";

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string; preserveLabel?: boolean }[];
}) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const label = item.preserveLabel ? item.label : cleanPublicTitle(item.label);
          return (
            <li key={`${item.label}-${index}`}>
              {item.href && !last ? (
                <Link href={item.href}>{label}</Link>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
