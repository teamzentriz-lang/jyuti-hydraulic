import {
  automationBlockMessage,
  decodeWpText,
  isAutomationBlocked,
  type WpRendered,
} from "@/lib/import/wordpress-phase-a";

export type WpPageItem = {
  id: number;
  slug: string;
  link: string;
  parent: number;
  featured_media: number;
  title: WpRendered;
  content: WpRendered;
};

export type WpPostItem = {
  id: number;
  slug: string;
  link: string;
  date_gmt?: string;
  featured_media: number;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
};

export type WpMediaRef = {
  source_url?: string;
};

export type ImportCliOptions = {
  dryRun: boolean;
  limit: number | null;
  pageStart: number;
  skipSeo: boolean;
  skipMedia: boolean;
  purgeDummy: boolean;
};

export function wpOrigin() {
  return (process.env.WP_ORIGIN || "https://jyotihydraulic.com").replace(/\/$/, "");
}

export function wpAuthHeaders(): HeadersInit {
  const user = process.env.WP_USER?.trim();
  const password = process.env.WP_APPLICATION_PASSWORD?.replace(/\s/g, "");
  const headers: Record<string, string> = {
    Accept: "application/json, */*",
    "User-Agent": "JyotiHydraulicMigration/1.0",
  };
  if (user && password) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  }
  return headers;
}

export async function readWordPress(url: string) {
  const response = await fetch(url, { headers: wpAuthHeaders() });
  const body = await response.text();
  const origin = wpOrigin();
  if (isAutomationBlocked(response.status, body)) {
    throw new Error(automationBlockMessage(origin));
  }
  if (!response.ok) {
    throw new Error(`WordPress returned ${response.status} for ${url}`);
  }
  if (body.trimStart().startsWith("<")) {
    throw new Error(automationBlockMessage(origin));
  }
  return { response, body };
}

export function parseImportCliOptions(argv: string[]): ImportCliOptions {
  const dryRun = argv.includes("--dry-run");
  const skipSeo = argv.includes("--skip-seo");
  const skipMedia = argv.includes("--skip-media");
  const purgeDummy = !argv.includes("--keep-seed");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limitValue = limitArg ? Number(limitArg.slice("--limit=".length)) : null;
  const pageStartArg = argv.find((arg) => arg.startsWith("--page-start="));
  const pageStartValue = pageStartArg ? Number(pageStartArg.slice("--page-start=".length)) : 1;
  return {
    dryRun,
    skipSeo,
    skipMedia,
    purgeDummy,
    limit: limitValue && Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null,
    pageStart: Number.isInteger(pageStartValue) && pageStartValue > 0 ? pageStartValue : 1,
  };
}

export function wpPageTitle(page: WpPageItem) {
  return decodeWpText(page.title?.rendered).slice(0, 300);
}

export function wpPageContentHtml(page: WpPageItem) {
  return page.content?.rendered ?? "";
}

export function wpPostTitle(post: WpPostItem) {
  return decodeWpText(post.title?.rendered).slice(0, 300);
}

export function wpPostContentHtml(post: WpPostItem) {
  return post.content?.rendered ?? "";
}

export function wpPostExcerptHtml(post: WpPostItem) {
  return post.excerpt?.rendered ?? "";
}

const PAGE_FIELDS =
  "id,slug,link,parent,featured_media,title,content";

export async function listAllPublishedPages(limit: number | null, pageStart = 1) {
  const base = wpOrigin();
  const items: WpPageItem[] = [];
  let page = pageStart;
  let totalPages = pageStart;

  while (page <= totalPages) {
    const url = `${base}/wp-json/wp/v2/pages?per_page=100&page=${page}&status=publish&orderby=id&order=asc&_fields=${PAGE_FIELDS}`;
    const { response, body } = await readWordPress(url);
    const batch = JSON.parse(body) as WpPageItem[];
    totalPages = Number(response.headers.get("x-wp-totalpages") || "1");
    items.push(...batch);
    console.log(`Listed pages ${page}/${totalPages} (${items.length} total).`);
    if (limit && items.length >= limit) return items.slice(0, limit);
    page += 1;
  }

  return items;
}

const POST_FIELDS = "id,slug,link,date_gmt,featured_media,title,content,excerpt";

export async function listAllPublishedPosts(limit: number | null, pageStart = 1) {
  const base = wpOrigin();
  const items: WpPostItem[] = [];
  let page = pageStart;
  let totalPages = pageStart;

  while (page <= totalPages) {
    const url = `${base}/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish&orderby=id&order=asc&_fields=${POST_FIELDS}`;
    const { response, body } = await readWordPress(url);
    const batch = JSON.parse(body) as WpPostItem[];
    totalPages = Number(response.headers.get("x-wp-totalpages") || "1");
    items.push(...batch);
    console.log(`Listed posts ${page}/${totalPages} (${items.length} total).`);
    if (limit && items.length >= limit) return items.slice(0, limit);
    page += 1;
  }

  return items;
}

export async function fetchWpAttachmentSourceUrl(wpMediaId: number) {
  if (!wpMediaId) return null;
  const base = wpOrigin();
  const url = `${base}/wp-json/wp/v2/media/${wpMediaId}?_fields=source_url`;
  const { body } = await readWordPress(url);
  const item = JSON.parse(body) as WpMediaRef;
  return item.source_url ?? null;
}

export type WpMenuNode = {
  id: number;
  title: string;
  url: string;
  parent: number;
  order: number;
  children?: WpMenuNode[];
};

type WpMenuApiItem = {
  ID?: number;
  id?: number;
  title?: string;
  url?: string;
  menu_item_parent?: string | number;
  order?: number;
  parent?: number;
  children?: WpMenuApiItem[];
};

type WpMenuApiMenu = {
  name?: string;
  slug?: string;
  locations?: string[];
  items?: WpMenuApiItem[];
};

function normalizeMenuNode(item: WpMenuApiItem): WpMenuNode {
  const id = Number(item.ID ?? item.id ?? 0);
  const parentRaw = item.menu_item_parent ?? item.parent ?? 0;
  return {
    id,
    title: decodeWpText(typeof item.title === "string" ? item.title : String(item.title ?? "")),
    url: item.url ?? "",
    parent: Number(parentRaw) || 0,
    order: Number(item.order ?? 0),
    children: item.children?.map(normalizeMenuNode),
  };
}

/** Best-effort WordPress menu import (requires a menus REST plugin on the live site). */
export async function fetchWordPressMenus(): Promise<{ slug: string; name: string; locations: string[]; items: WpMenuNode[] }[]> {
  const base = wpOrigin();
  const endpoints = [`${base}/wp-json/wp-api-menus/v2/menus`, `${base}/wp-json/menus/v1/menus`];
  for (const url of endpoints) {
    try {
      const { body } = await readWordPress(url);
      const parsed = JSON.parse(body) as WpMenuApiMenu[] | { menus?: WpMenuApiMenu[] };
      const menus = Array.isArray(parsed) ? parsed : (parsed.menus ?? []);
      if (!menus.length) continue;
      return menus.map((menu) => ({
        slug: menu.slug ?? menu.name?.toLowerCase().replace(/\s+/g, "-") ?? "menu",
        name: menu.name ?? "Menu",
        locations: menu.locations ?? [],
        items: (menu.items ?? []).map(normalizeMenuNode),
      }));
    } catch {
      // try next endpoint
    }
  }
  return [];
}

export async function fetchSeoFromPublicHtml(publicUrl: string) {
  const response = await fetch(publicUrl, { headers: wpAuthHeaders() });
  const html = await response.text();
  if (!response.ok || isAutomationBlocked(response.status, html)) {
    return { seoTitle: null as string | null, seoDescription: null as string | null };
  }
  const title = html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim() ?? null;
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
    null;
  return {
    seoTitle: title ? decodeWpText(title).slice(0, 300) : null,
    seoDescription: desc ? decodeWpText(desc).slice(0, 500) : null,
  };
}
