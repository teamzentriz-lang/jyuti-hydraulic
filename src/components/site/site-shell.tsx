import Link from "next/link";
import { NavList } from "@/components/site/nav-list";
import { SiteHeader } from "@/components/site/site-header";
import { CmsImage } from "@/components/site/cms-image";
import type { SiteContext } from "@/lib/cms/site";
import { publicPath } from "@/lib/paths";

function socialLinks(site: SiteContext) {
  const fromFooter = site.footer.socialLinksJson.filter((item) => item.url?.trim());
  if (fromFooter.length) return fromFooter;
  const fallback: { network: string; url: string }[] = [];
  if (site.settings.youtubeUrl) fallback.push({ network: "YouTube", url: site.settings.youtubeUrl });
  if (site.settings.facebookUrl) fallback.push({ network: "Facebook", url: site.settings.facebookUrl });
  if (site.settings.instagramUrl) fallback.push({ network: "Instagram", url: site.settings.instagramUrl });
  if (site.settings.linkedinUrl) fallback.push({ network: "LinkedIn", url: site.settings.linkedinUrl });
  return fallback;
}

export function SiteShell({ site, children }: { site: SiteContext; children: React.ReactNode }) {
  const { settings, header, footer, logo, mobileLogo, footerLogo, headerNav, footerNav } = site;
  const topEmail = header.email?.trim() || settings.emailPrimary;
  const topPhone = header.phone?.trim() || settings.phonePrimary;
  const quoteLabel = header.ctaText?.trim() || settings.quoteCtaLabel;
  const quoteHref = header.ctaUrl?.trim() || settings.quoteCtaHref;
  const footerBlurb = footer.description?.trim() || settings.footerText;
  const copyright =
    footer.copyrightText?.trim() ||
    settings.copyrightText?.trim() ||
    `© Copyright ${new Date().getFullYear()} by ${settings.companyName.toLowerCase()}`;
  const social = socialLinks(site);

  return (
    <div className="min-h-screen bg-white text-ink">
      {header.topBarEnabled !== false ? (
        <div className="border-b border-line bg-[#1a1a1a] text-sm text-white/90">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-6">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {header.topBarText ? <span>{header.topBarText}</span> : null}
              {topEmail ? (
                <a href={`mailto:${topEmail}`} className="hover:text-white hover:underline">
                  {topEmail}
                </a>
              ) : null}
              {topPhone ? (
                <>
                  {topEmail ? <span className="text-white/40">,</span> : null}
                  <a href={`tel:${topPhone.replace(/\s/g, "")}`} className="hover:text-white hover:underline">
                    {topPhone}
                  </a>
                </>
              ) : null}
            </p>
            <Link href={publicPath(quoteHref)} className="font-semibold text-signal hover:underline">
              {quoteLabel}
            </Link>
          </div>
        </div>
      ) : null}

      <SiteHeader
        companyName={settings.companyName}
        logo={logo}
        mobileLogo={mobileLogo}
        nav={headerNav}
        phone={topPhone}
        quoteLabel={quoteLabel}
        quoteHref={quoteHref}
        sticky={header.stickyHeader}
      />

      {children}

      {settings.whatsapp ? (
        <a
          href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-xs font-bold text-white shadow-lg hover:bg-[#1fb855]"
          aria-label="WhatsApp"
        >
          WA
        </a>
      ) : null}

      <footer className="border-t-4 border-signal bg-navy text-white">
        <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-6">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              {footerLogo ? (
                <CmsImage item={footerLogo} alt={settings.companyName} className="mb-4 h-10 w-auto object-contain" />
              ) : (
                <p className="text-lg font-semibold">{settings.companyName}</p>
              )}
              <p className="mt-3 max-w-lg text-sm leading-7 text-white/85">{footerBlurb}</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Links</p>
              {footerNav.length ? (
                <nav className="mt-3">
                  <NavList items={footerNav} variant="footer" />
                </nav>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Contact</p>
              <address className="mt-3 space-y-2 text-sm not-italic leading-6 text-white/85">
                <p>{settings.address}</p>
                <p>
                  {settings.emailSecondary ? (
                    <a href={`mailto:${settings.emailSecondary}`} className="hover:underline">
                      {settings.emailSecondary}
                    </a>
                  ) : null}
                  {settings.emailSecondary && settings.emailPrimary ? <br /> : null}
                  <a href={`mailto:${settings.emailPrimary}`} className="hover:underline">
                    {settings.emailPrimary}
                  </a>
                </p>
                <p>
                  <a href={`tel:${settings.phonePrimary.replace(/\s/g, "")}`} className="hover:underline">
                    {settings.phonePrimary}
                  </a>
                </p>
              </address>
            </div>
          </div>

          {footer.newsletterEnabled ? (
            <div className="mt-10 border-t border-white/15 pt-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
                {footer.newsletterTitle || "Newsletter"}
              </p>
              {footer.newsletterDescription ? (
                <p className="mt-2 text-sm text-white/80">{footer.newsletterDescription}</p>
              ) : null}
              <form className="mt-3 flex max-w-md flex-wrap gap-2" action="#" method="post">
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  className="min-w-[200px] flex-1 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50"
                  disabled
                />
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-md bg-signal px-4 py-2 text-sm font-semibold opacity-70"
                >
                  Subscribe
                </button>
              </form>
            </div>
          ) : null}

          {social.length ? (
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {social.map((item) => (
                <a
                  key={`${item.network}-${item.url}`}
                  href={item.url}
                  className="text-white/90 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.network}
                </a>
              ))}
            </div>
          ) : null}

          <p className="mt-8 text-center text-xs text-white/60">{copyright}</p>
        </div>
      </footer>
    </div>
  );
}
