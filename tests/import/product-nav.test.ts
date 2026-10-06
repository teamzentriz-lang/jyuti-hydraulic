import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProductsDropdownNav,
  dedupeNavRoots,
  isProductsNavItem,
  mergeProductsNavChildren,
} from "@/lib/cms/product-nav";
import type { NavItem } from "@/lib/cms/site";
import { pickWordPressMenusForImport, wordPressMenuRoots } from "@/lib/import/wordpress-nav";

test("dedupeNavRoots removes duplicate top-level links", () => {
  const items: NavItem[] = [
    { id: "1", label: "Home", href: "/", openInNewTab: false, children: [] },
    { id: "2", label: "Home", href: "/", openInNewTab: false, children: [] },
    { id: "3", label: "Blogs", href: "/blogs/", openInNewTab: false, children: [] },
  ];
  assert.equal(dedupeNavRoots(items).length, 2);
});

test("buildProductsDropdownNav prefers header Products children over catalogue roots", () => {
  const catalog: NavItem[] = [
    { id: "c1", label: "Hydraulic Power Pack", href: "/hydraulic-power-pack/", openInNewTab: false, children: [] },
  ];
  const nav: NavItem[] = [
    {
      id: "p",
      label: "Products",
      href: "/old/",
      openInNewTab: false,
      children: [{ id: "x", label: "Hydraulic Cylinder Manufacturers", href: "/hydraulic-cylinder/", openInNewTab: false, children: [] }],
    },
  ];
  const menu = buildProductsDropdownNav([], nav, catalog);
  assert.equal(menu.length, 1);
  assert.equal(menu[0]?.label, "Hydraulic Cylinder Manufacturers");
});

test("buildProductsDropdownNav falls back to catalogue when no admin menu exists", () => {
  const catalog: NavItem[] = [
    { id: "c1", label: "Hydraulic Power Pack", href: "/hydraulic-power-pack/", openInNewTab: false, children: [] },
  ];
  const nav: NavItem[] = [{ id: "p", label: "Products", href: "/old/", openInNewTab: false, children: [] }];
  const menu = buildProductsDropdownNav([], nav, catalog);
  assert.equal(menu[0]?.label, "Hydraulic Power Pack");
});

test("mergeProductsNavChildren attaches resolved Products menu to header", () => {
  const productsChildren: NavItem[] = [
    { id: "x", label: "Screw Jack", href: "/screw-jack/", openInNewTab: false, children: [] },
  ];
  const nav: NavItem[] = [{ id: "p", label: "Products", href: "/products/", openInNewTab: false, children: [] }];
  const merged = mergeProductsNavChildren(nav, productsChildren);
  assert.equal(merged[0]?.children[0]?.label, "Screw Jack");
});

test("isProductsNavItem matches label", () => {
  assert.equal(isProductsNavItem({ id: "1", label: "Products", href: "/", openInNewTab: false, children: [] }), true);
});

test("wordPressMenuRoots keeps only top-level when parent ids exist", () => {
  const roots = wordPressMenuRoots([
    { id: 1, title: "Home", url: "/", parent: 0, order: 1 },
    { id: 2, title: "About", url: "/about/", parent: 0, order: 2 },
    { id: 3, title: "Team", url: "/team/", parent: 2, order: 1 },
  ]);
  assert.equal(roots.length, 2);
});

test("pickWordPressMenusForImport chooses one header menu", () => {
  const picked = pickWordPressMenusForImport([
    { slug: "main-menu", name: "Main Menu", locations: ["primary"], items: [{ id: 1, title: "Home", url: "/", parent: 0, order: 1 }] },
    { slug: "copy-menu", name: "Copy", locations: ["header"], items: [{ id: 2, title: "Home", url: "/", parent: 0, order: 1 }] },
  ]);
  assert.equal(picked.length, 1);
  assert.equal(picked[0]?.slug, "main-menu");
});
