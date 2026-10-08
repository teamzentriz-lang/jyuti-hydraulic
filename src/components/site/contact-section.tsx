import type { ReactNode } from "react";

function formatHours(value: string) {
  const match = value.trim().match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (!match) return value.trim();
  const start = Number(match[1]);
  let end = Number(match[2]);
  if (end <= start && end < 12) end += 12;
  const clock = (n: number) => {
    const suffix = n >= 12 ? "PM" : "AM";
    const h = n % 12 || 12;
    return `${h}:00 ${suffix}`;
  };
  return `${clock(start)} – ${clock(end)}`;
}
import { AboutReveal } from "@/components/site/about-reveal";
import { QuoteForm } from "@/components/site/quote-form";
import { getContactSettings, getSettings } from "@/lib/cms/queries";

export async function ContactSection({
  subject = "",
  pagePath = "/contact/",
}: {
  subject?: string;
  pagePath?: string;
}) {
  const [contact, settings] = await Promise.all([
    getContactSettings(),
    getSettings(),
  ]);
  const address = contact.address?.trim() || settings.address;
  const email = contact.email?.trim() || settings.emailPrimary;
  const emailSecondary =
    settings.emailSecondary && settings.emailSecondary !== email
      ? settings.emailSecondary
      : "";
  const phone = contact.phone?.trim() || settings.phonePrimary;
  const phoneSecondary = settings.phoneSecondary;
  const summary =
    contact.subtitle?.trim() ||
    contact.description?.trim() ||
    "Have a query or need a customized solution? Our team is here to help you.";
  const detailRows: Array<{ label: string; value: ReactNode } | null> = [
    address ? { label: "Our Address", value: address } : null,
    phone
      ? {
          label: "Call Us",
          value: (
            <>
              <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
              {phoneSecondary ? (
                <>
                  <br />
                  <a href={`tel:${phoneSecondary.replace(/\s/g, "")}`}>{phoneSecondary}</a>
                </>
              ) : null}
            </>
          ),
        }
      : null,
    email
      ? {
          label: "Email Us",
          value: (
            <>
              <a href={`mailto:${email}`}>{email}</a>
              {emailSecondary ? (
                <>
                  <br />
                  <a href={`mailto:${emailSecondary}`}>{emailSecondary}</a>
                </>
              ) : null}
            </>
          ),
        }
      : null,
    contact.businessHours?.trim()
      ? { label: "Working Hours", value: formatHours(contact.businessHours) }
      : null,
  ];
  const details = detailRows.filter(
    (item): item is { label: string; value: ReactNode } => item !== null,
  );

  return (
    <main className="contact-page motion-page">
      <AboutReveal />
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker about-in">Get in touch</p>
          <h1 className="about-in" style={{ animationDelay: "80ms" }}>
            {contact.title?.trim() || "Contact"}
          </h1>
          <p className="about-in" style={{ animationDelay: "160ms" }}>
            {summary}
          </p>
        </div>
      </div>
      <div className="site-container contact-layout">
        <section className="contact-details">
          <p className="section-label about-in">Reach the team</p>
          <h2 className="about-in" style={{ animationDelay: "80ms" }}>
            We are ready to help
          </h2>
          <ul>
            {details.map((item, index) => (
              <li
                key={item.label}
                className="contact-row"
                style={{ animationDelay: `${160 + index * 80}ms` }}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
          {address ? (
            <div className="contact-map">
              <iframe
                title="Map showing the Jyoti Hydraulic address"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(address.replace(/&amp;/g, "&"))}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(address.replace(/&amp;/g, "&"))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          ) : null}
        </section>
        <section className="contact-form-wrap">
          <div className="contact-form-card about-in" style={{ animationDelay: "180ms" }}>
            <h2>Request a Quote</h2>
            <p>Fill in the details and our team will get back to you shortly.</p>
            <QuoteForm subject={subject} pagePath={pagePath} />
          </div>
        </section>
      </div>
    </main>
  );
}
