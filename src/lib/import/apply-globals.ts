import { eq, ilike, or } from "drizzle-orm";
import type { getDb } from "@/db";
import { contactSettings, footerSettings, headerSettings, media, siteSettings } from "@/db/schema";
import { isPlaceholderMedia } from "@/lib/media-url";
import {
  contactGlobals,
  footerGlobals,
  headerGlobals,
  pickLogoCandidate,
  siteGlobals,
  type LogoCandidate,
} from "@/lib/import/wordpress-phase-a";

type Db = ReturnType<typeof getDb>;

export async function findMigratedLogo(db: Db): Promise<LogoCandidate | null> {
  const rows = await db
    .select({ id: media.id, filename: media.filename, mimeType: media.mimeType, url: media.url, legacyUrl: media.legacyUrl })
    .from(media)
    .where(
      or(
        ilike(media.filename, "%logo%"),
        ilike(media.originalName, "%logo%"),
        ilike(media.legacyUrl, "%logo%"),
        ilike(media.filename, "%favicon%"),
      ),
    )
    .limit(300);
  const migrated = rows.filter((row) => row.legacyUrl && !isPlaceholderMedia(row));
  return pickLogoCandidate(migrated.map((row) => ({ id: row.id, filename: row.filename, mimeType: row.mimeType })));
}

export async function findCatalogueMediaId(db: Db) {
  const [row] = await db
    .select({ id: media.id })
    .from(media)
    .where(ilike(media.legacyUrl, "%e-catalogue-jyoti-hydraulic-new.pdf%"))
    .limit(1);
  return row?.id ?? null;
}

async function shouldReplaceMedia(db: Db, mediaId: string | null) {
  if (!mediaId) return true;
  const [row] = await db
    .select({ url: media.url, legacyUrl: media.legacyUrl })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);
  if (!row) return true;
  return !row.legacyUrl || isPlaceholderMedia(row);
}

export async function applyWordPressGlobals(db: Db, origin: string) {
  const globals = siteGlobals(origin);
  const logo = await findMigratedLogo(db);
  const catalogueId = (await findCatalogueMediaId(db)) ?? undefined;

  const [settings] = await db
    .select({
      logoId: siteSettings.logoId,
      faviconId: siteSettings.faviconId,
      catalogueId: siteSettings.catalogueId,
    })
    .from(siteSettings)
    .limit(1);

  const replaceLogo = await shouldReplaceMedia(db, settings?.logoId ?? null);
  const replaceFavicon = await shouldReplaceMedia(db, settings?.faviconId ?? null);
  const replaceCatalogue = await shouldReplaceMedia(db, settings?.catalogueId ?? null);

  await db
    .update(siteSettings)
    .set({
      companyName: globals.companyName,
      siteName: globals.siteName,
      tagline: globals.tagline,
      phonePrimary: globals.phonePrimary,
      emailPrimary: globals.emailPrimary,
      emailSecondary: globals.emailSecondary,
      enquiryToEmail: globals.enquiryToEmail,
      address: globals.address,
      addressLine1: globals.addressLine1,
      addressLine2: globals.addressLine2,
      city: globals.city,
      state: globals.state,
      country: globals.country,
      pincode: globals.pincode,
      whatsapp: globals.whatsapp,
      footerText: globals.footerText,
      footerDescription: globals.footerDescription,
      copyrightText: globals.copyrightText,
      establishedYear: globals.establishedYear,
      quoteCtaLabel: globals.quoteCtaLabel,
      quoteCtaHref: globals.quoteCtaHref,
      enquiryButtonText: globals.enquiryButtonText,
      ...(logo && replaceLogo ? { logoId: logo.id } : {}),
      ...(logo && replaceFavicon ? { faviconId: logo.id } : {}),
      ...(catalogueId && replaceCatalogue ? { catalogueId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, "default"));

  const header = headerGlobals();
  await db
    .update(headerSettings)
    .set({
      ...header,
      ...(logo && replaceLogo ? { logoId: logo.id } : {}),
      updatedAt: new Date(),
    })
    .where(eq(headerSettings.id, "default"));

  await db
    .update(footerSettings)
    .set({
      ...footerGlobals(),
      ...(logo && replaceLogo ? { logoId: logo.id } : {}),
      updatedAt: new Date(),
    })
    .where(eq(footerSettings.id, "default"));

  await db
    .update(contactSettings)
    .set({ ...contactGlobals(), updatedAt: new Date() })
    .where(eq(contactSettings.id, "default"));

  return { logo, catalogueId: catalogueId ?? null, replacedLogo: Boolean(logo && replaceLogo) };
}
