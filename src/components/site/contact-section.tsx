import { getContactSettings, getSettings } from "@/lib/cms/queries";

export async function ContactSection() {
  const [contact, settings] = await Promise.all([getContactSettings(), getSettings()]);
  const title = contact.title?.trim() || "Send an enquiry";
  const subtitle = contact.subtitle?.trim() || contact.description?.trim() || "Tell us about your requirement.";
  const address = contact.address?.trim() || settings.address;
  const email = contact.email?.trim() || settings.emailPrimary;
  const phone = contact.phone?.trim() || settings.phonePrimary;

  return (
    <section className="mt-12 grid gap-8 border border-line bg-paper p-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h2 className="text-xl font-bold text-navy">{title}</h2>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
        <ul className="mt-6 space-y-3 text-sm text-muted">
          {address ? <li>{address}</li> : null}
          {email ? (
            <li>
              <a href={`mailto:${email}`} className="font-medium text-navy hover:underline">
                {email}
              </a>
            </li>
          ) : null}
          {phone ? (
            <li>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-medium text-navy hover:underline">
                {phone}
              </a>
            </li>
          ) : null}
          {contact.businessHours?.trim() ? <li>{contact.businessHours}</li> : null}
        </ul>
      </div>
      <div>
        <p className="text-sm text-muted">Form submissions will connect to CMS inquiries in a later step.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" action="#" method="post">
          <label className="block text-sm">
            <span className="font-medium text-navy">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              name="name"
              placeholder="Your name"
              disabled
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-navy">Email</span>
            <input
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              name="email"
              type="email"
              placeholder="you@example.com"
              disabled
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-navy">Phone</span>
            <input className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" name="phone" placeholder="+91" disabled />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-navy">Message</span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-line bg-white px-3 py-2"
              name="message"
              placeholder="Tell us about your requirement"
              disabled
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              className="site-btn-primary cursor-not-allowed opacity-70"
              disabled
            >
              Submit (coming soon)
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
