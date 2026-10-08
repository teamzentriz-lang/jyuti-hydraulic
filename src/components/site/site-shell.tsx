import Link from "next/link";

import { NavList } from "@/components/site/nav-list";

import { NewsletterForm } from "@/components/site/newsletter-form";
import { SiteHeader } from "@/components/site/site-header";

import { CmsImage } from "@/components/site/cms-image";

import type { SiteContext } from "@/lib/cms/site";

import { publicPath } from "@/lib/paths";

function socialLinks(site: SiteContext) {
  const fromFooter = site.footer.socialLinksJson.filter((item) =>
    item.url?.trim(),
  );

  if (fromFooter.length) return fromFooter;

  const fallback: { network: string; url: string }[] = [];

  if (site.settings.youtubeUrl)
    fallback.push({ network: "YouTube", url: site.settings.youtubeUrl });

  if (site.settings.facebookUrl)
    fallback.push({ network: "Facebook", url: site.settings.facebookUrl });

  if (site.settings.instagramUrl)
    fallback.push({ network: "Instagram", url: site.settings.instagramUrl });

  if (site.settings.linkedinUrl)
    fallback.push({ network: "LinkedIn", url: site.settings.linkedinUrl });

  return fallback;
}

function SocialMark({ network }: { network: string }) {
  const name = network.toLowerCase();
  if (name.includes("youtube")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6ZM9.8 15.5v-6.6l6.2 3.3-6.2 3.3Z" />
      </svg>
    );
  }
  if (name.includes("facebook")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3h-2.1C12.2 3 11 4.4 11 6.6v1.9H9v2.8h2V21h3.5v-9.7h2.3l.4-2.8h-2.7Z" />
      </svg>
    );
  }
  if (name.includes("instagram")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name.includes("linkedin")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M6.5 9H4V20h2.5V9ZM5.2 4C4.3 4 3.6 4.7 3.6 5.6S4.3 7.2 5.2 7.2 6.8 6.5 6.8 5.6 6.1 4 5.2 4ZM20 20h-2.5v-5.6c0-1.6-.6-2.6-2-2.6-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V20H11V9h2.4v1.5c.4-.7 1.3-1.8 3.2-1.8 2.3 0 4 1.5 4 4.8V20Z" />
      </svg>
    );
  }
  return <span>{network.slice(0, 1)}</span>;
}

export function SiteShell({
  site,
  children,
}: {
  site: SiteContext;
  children: React.ReactNode;
}) {
  const {
    settings,
    header,
    footer,
    logo,
    mobileLogo,
    footerLogo,
    headerNav,
    footerNav,
  } = site;

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
  const announcement = header.topBarText?.trim() ?? "";
  const repeatsContact =
    (topEmail && announcement.includes(topEmail)) ||
    (topPhone && announcement.replace(/\s/g, "").includes(topPhone.replace(/\s/g, "")));

  return (
    <div className="public-site min-h-screen bg-white text-ink">
      {header.topBarEnabled !== false ? (
        <div className="hidden border-b border-line bg-navy text-xs text-white/90 lg:block">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-6">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {!repeatsContact && announcement ? <span>{announcement}</span> : null}

              {topEmail ? (
                <a
                  href={`mailto:${topEmail}`}
                  className="transition hover:text-signal"
                >
                  {topEmail}
                </a>
              ) : null}

              {topEmail && topPhone ? <span className="text-white/35" aria-hidden>|</span> : null}

              {topPhone ? (
                <a
                  href={`tel:${topPhone.replace(/\s/g, "")}`}
                  className="transition hover:text-signal"
                >
                  {topPhone}
                </a>
              ) : null}
            </p>

            <Link
              href={publicPath(quoteHref)}
              className="font-semibold text-signal hover:underline"
            >
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

      {topPhone || settings.whatsapp ? (
        <div className="float-actions">
          {topPhone ? (
            <a
              className="float-actions__phone"
              href={`tel:${topPhone.replace(/\s/g, "")}`}
              aria-label={`Call ${topPhone}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7.5 3.8c.4-.4 1-.5 1.5-.2l2.1 1.2c.5.3.8.9.7 1.5l-.4 2.2a1.4 1.4 0 0 1-.8 1l-1.2.6a9.6 9.6 0 0 0 4.8 4.8l.6-1.2c.2-.4.6-.7 1-.8l2.2-.4c.6-.1 1.2.2 1.5.7l1.2 2.1c.3.5.2 1.1-.2 1.5l-1.4 1.4c-.4.4-1 .6-1.6.5C10.2 18.4 5.6 13.8 4.3 7.4c-.1-.6.1-1.2.5-1.6L7.5 3.8Z"
                  fill="currentColor"
                />
              </svg>
            </a>
          ) : null}
          {settings.whatsapp ? (
            <a
              className="float-actions__whatsapp"
              href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.76 13.9c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.63-.6-2.87-1.24-4.74-4.13-4.88-4.32-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.24-.25.64-.36.85-.36h.61c.2 0 .46-.07.72.55.27.64.91 2.22.99 2.38.08.16.13.35.03.56-.1.21-.15.34-.3.52-.15.18-.31.4-.45.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.96.3.15.5.22.57.34.08.13.08.74-.16 1.42Z" />
              </svg>
            </a>
          ) : null}
        </div>
      ) : null}

      <footer className="site-footer">
        <div className="site-container site-footer__main">
          <div className="site-footer__brand">
            {footerLogo ? (
              <CmsImage
                item={footerLogo}
                alt={settings.companyName}
                className="site-footer__logo"
              />
            ) : (
              <p className="site-footer__name">{settings.companyName}</p>
            )}
            <p>{footerBlurb}</p>
          </div>

          <div>
            <h2>Links</h2>
            {footerNav.length ? (
              <nav aria-label="Footer">
                <NavList items={footerNav} variant="footer" className="site-footer__links" />
              </nav>
            ) : null}
          </div>

          <div>
            <h2>Contact</h2>
            <ul className="site-footer__contact">
              {settings.address ? (
                <li>
                  <span aria-hidden>⌂</span>
                  <p>{settings.address}</p>
                </li>
              ) : null}
              {settings.emailSecondary || settings.emailPrimary ? (
                <li>
                  <span aria-hidden>✉</span>
                  <p>
                    {settings.emailSecondary ? (
                      <a href={`mailto:${settings.emailSecondary}`}>{settings.emailSecondary}</a>
                    ) : null}
                    {settings.emailPrimary ? (
                      <a href={`mailto:${settings.emailPrimary}`}>{settings.emailPrimary}</a>
                    ) : null}
                  </p>
                </li>
              ) : null}
              {settings.phonePrimary ? (
                <li>
                  <span aria-hidden>☎</span>
                  <p>
                    <a href={`tel:${settings.phonePrimary.replace(/\s/g, "")}`}>{settings.phonePrimary}</a>
                  </p>
                </li>
              ) : null}
            </ul>
          </div>

          {footer.newsletterEnabled ? (
            <div className="site-footer__news">
              <h2>
                {/[aeiou]/i.test((footer.newsletterTitle ?? "").replace(/[^a-z]/gi, ""))
                  ? footer.newsletterTitle
                  : "Newsletter"}
              </h2>
              {footer.newsletterDescription ? <p>{footer.newsletterDescription}</p> : null}
              <NewsletterForm />
            </div>
          ) : null}
        </div>
        <div className="site-container site-footer__bar">
          <p>{copyright}</p>
          {social.length ? (
            <div className="site-footer__social">
              {social.map((item) => (
                <a
                  key={`${item.network}-${item.url}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.network}
                >
                  <SocialMark network={item.network} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
