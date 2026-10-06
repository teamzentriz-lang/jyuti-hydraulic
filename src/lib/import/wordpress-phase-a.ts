import { brand } from "@/lib/brand";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXTENSION));

export const CATALOGUE_PATH = "/e-catalogue-jyoti-hydraulic-new.pdf";

export type WpRendered = { rendered?: string };

export type WpMediaItem = {
  id?: number;
  date_gmt?: string;
  title?: WpRendered;
  caption?: WpRendered;
  description?: WpRendered;
  alt_text?: string;
  mime_type?: string;
  source_url?: string;
  media_details?: {
    width?: number;
    height?: number;
    filesize?: number;
  };
};

export type PreparedMedia = {
  legacyUrl: string;
  filename: string;
  mimeType: string;
  alt: string;
  title: string;
  caption: string;
  description: string;
  width: number | null;
  height: number | null;
  prefix: string;
  createdAt: Date | null;
};

export function decodeWpText(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function extensionOf(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function resolveMimeType(filename: string, wordpressMime: string | undefined) {
  const fromWp = wordpressMime?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (ALLOWED_MIME.has(fromWp)) return fromWp;
  return MIME_BY_EXTENSION[extensionOf(filename)] ?? "";
}

export function canonicalLegacyUrl(input: string) {
  const url = new URL(input.trim().replace(/ /g, "%20"));
  url.hash = "";
  url.search = "";
  return url.toString();
}

/** Strip WordPress generated size suffixes (`-725x1024`, `-scaled`) from upload filenames. */
export function normalizeWordPressSizedUploadUrl(input: string) {
  const url = new URL(input.trim().replace(/ /g, "%20"));
  const segments = url.pathname.split("/");
  const file = segments.pop() ?? "";
  let base = decodeURIComponent(file);
  let changed = true;
  while (changed) {
    changed = false;
    const withoutSize = base.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
    if (withoutSize !== base) {
      base = withoutSize;
      changed = true;
    }
    const withoutScaled = base.replace(/-scaled(\.[a-z0-9]+)$/i, "$1");
    if (withoutScaled !== base) {
      base = withoutScaled;
      changed = true;
    }
  }
  segments.push(base);
  url.pathname = segments.map((part) => encodeURIComponent(decodeURIComponent(part))).join("/");
  url.hash = "";
  url.search = "";
  return url.toString();
}

export function filenameFromUrl(legacyUrl: string) {
  const pathname = new URL(legacyUrl).pathname;
  const name = decodeURIComponent(pathname.split("/").pop() || "file");
  return name || "file";
}

export function wordpressStoragePrefix(legacyUrl: string) {
  const match = new URL(legacyUrl).pathname.match(/\/wp-content\/uploads\/(\d{4})\/(\d{2})\//);
  if (!match) return "wordpress/library";
  return `wordpress/${match[1]}/${match[2]}`;
}

export function prepareMediaItem(item: WpMediaItem): PreparedMedia | null {
  if (!item.source_url) return null;
  let legacyUrl: string;
  try {
    legacyUrl = canonicalLegacyUrl(item.source_url);
  } catch {
    return null;
  }
  const filename = filenameFromUrl(legacyUrl);
  const mimeType = resolveMimeType(filename, item.mime_type);
  if (!mimeType) return null;
  const createdAt = item.date_gmt ? new Date(item.date_gmt) : null;
  return {
    legacyUrl,
    filename,
    mimeType,
    alt: (item.alt_text ?? "").trim().slice(0, 300),
    title: decodeWpText(item.title?.rendered).slice(0, 300),
    caption: decodeWpText(item.caption?.rendered).slice(0, 2000),
    description: decodeWpText(item.description?.rendered).slice(0, 4000),
    width: item.media_details?.width ?? null,
    height: item.media_details?.height ?? null,
    prefix: wordpressStoragePrefix(legacyUrl),
    createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
  };
}

export function isAutomationBlocked(status: number, body: string) {
  return status === 403 || /imunify360|one moment, please/i.test(body);
}

export function automationBlockMessage(origin: string) {
  return [
    `WordPress at ${origin} refused this machine (Imunify360 bot protection).`,
    "In SiteGround / Imunify360, whitelist this computer's public IP, then run the import again.",
    "Optional: set WP_USER and WP_APPLICATION_PASSWORD if the REST API requires a login.",
  ].join(" ");
}

export type LogoCandidate = {
  id: string;
  filename: string;
  mimeType: string;
};

export function pickLogoCandidate(files: LogoCandidate[]) {
  const ranked = files
    .filter((file) => file.mimeType.startsWith("image/") && /logo/i.test(file.filename))
    .map((file) => ({ file, score: logoScore(file.filename) }))
    .sort((a, b) => b.score - a.score || a.file.filename.length - b.file.filename.length);
  return ranked[0]?.file ?? null;
}

function logoScore(filename: string) {
  let score = 1;
  if (/jyoti/i.test(filename)) score += 5;
  if (/favicon|icon/i.test(filename)) score -= 4;
  if (/-\d+x\d+\./i.test(filename)) score -= 6;
  return score;
}

export function siteGlobals(catalogueUrl: string) {
  return {
    companyName: brand.companyName,
    siteName: brand.companyName,
    tagline: "Hydraulic machines and power packs",
    phonePrimary: brand.phonePrimary,
    emailPrimary: brand.emailPrimary,
    emailSecondary: brand.emailSecondary,
    enquiryToEmail: brand.emailPrimary,
    address: brand.address,
    addressLine1: "Plot No. 01 & 02, Sector-57",
    addressLine2: "",
    city: "Faridabad",
    state: "Haryana",
    country: "India",
    pincode: "121004",
    whatsapp: brand.whatsapp,
    footerText: brand.footerText,
    footerDescription: brand.footerText,
    copyrightText: "© Copyright 2024 by jyotihydraulic",
    establishedYear: 2014,
    quoteCtaLabel: brand.quoteCtaLabel,
    quoteCtaHref: brand.quoteCtaHref,
    enquiryButtonText: brand.quoteCtaLabel,
    catalogueLegacyUrl: new URL(CATALOGUE_PATH, catalogueUrl).toString(),
  };
}

export function headerGlobals() {
  return {
    phone: brand.phonePrimary,
    email: brand.emailPrimary,
    ctaText: brand.quoteCtaLabel,
    ctaUrl: brand.quoteCtaHref,
    topBarText: `${brand.emailPrimary}, ${brand.phonePrimary}`,
  };
}

export function footerGlobals() {
  return {
    description: brand.footerText,
    copyrightText: "© Copyright 2024 by jyotihydraulic",
    contactInformationJson: {
      address: brand.address,
      phone: brand.phonePrimary,
      email: brand.emailPrimary,
      emailSecondary: brand.emailSecondary,
    },
  };
}

export function contactGlobals() {
  return {
    title: "Contact",
    address: brand.address,
    email: brand.emailPrimary,
    phone: brand.phonePrimary,
    whatsapp: brand.whatsapp ?? "",
  };
}
