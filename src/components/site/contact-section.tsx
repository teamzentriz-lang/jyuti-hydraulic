import type { ReactNode } from "react";
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
  const phone = contact.phone?.trim() || settings.phonePrimary;
  const phoneSecondary = settings.phoneSecondary;
  const summary =
    contact.subtitle?.trim() ||
    contact.description?.trim() ||
    "Have a query or need a customized solution? Our team is here to help you.";
  const details = [
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
          value: <a href={`mailto:${email}`}>{email}</a>,
        }
      : null,
    contact.businessHours?.trim()
      ? { label: "Working Hours", value: contact.businessHours }
      : null,
  ].filter((item): item is { label: string; value: ReactNode } => Boolean(item));

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
