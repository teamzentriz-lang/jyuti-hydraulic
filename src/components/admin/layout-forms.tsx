"use client";

import { useActionState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/admin/styles";
import {
  saveContactSettingsAction,
  saveFooterAction,
  saveHeaderAction,
} from "@/lib/cms/actions";
import type { MediaItem } from "@/lib/cms/queries";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {error}
    </p>
  );
}

export function HeaderForm({
  header,
  media,
}: {
  header: {
    logoId: string | null;
    mobileLogoId: string | null;
    faviconId: string | null;
    topBarEnabled: boolean;
    topBarText: string;
    phone: string;
    email: string;
    ctaText: string;
    ctaUrl: string;
    stickyHeader: boolean;
  };
  media: MediaItem[];
}) {
  const [state, action, pending] = useActionState(saveHeaderAction, null);
  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-line bg-white p-4"
    >
      <ErrorNote error={state?.error} />
      <div>
        <span className={labelClass}>Logo</span>
        <MediaPicker
          name="logoId"
          initialIds={header.logoId ? [header.logoId] : []}
          known={media}
        />
      </div>
      <div>
        <span className={labelClass}>Mobile logo</span>
        <MediaPicker
          name="mobileLogoId"
          initialIds={header.mobileLogoId ? [header.mobileLogoId] : []}
          known={media}
        />
      </div>
      <div>
        <span className={labelClass}>Favicon</span>
        <MediaPicker
          name="faviconId"
          initialIds={header.faviconId ? [header.faviconId] : []}
          known={media}
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          name="topBarEnabled"
          type="checkbox"
          defaultChecked={header.topBarEnabled}
          className="h-4 w-4 accent-navy"
        />
        <span className="text-sm">Show top bar</span>
      </label>
      <label>
        <span className={labelClass}>Top bar text</span>
        <input
          className={inputClass}
          name="topBarText"
          defaultValue={header.topBarText}
        />
      </label>
      <label>
        <span className={labelClass}>Phone</span>
        <input
          className={inputClass}
          name="phone"
          defaultValue={header.phone}
        />
        <span className="mt-1 block text-xs text-muted">
          Add multiple numbers separated by a comma. Example: +91 9541424317, 8813881451
        </span>
      </label>
      <label>
        <span className={labelClass}>Email</span>
        <input
          className={inputClass}
          name="email"
          type="email"
          defaultValue={header.email}
        />
      </label>
      <label>
        <span className={labelClass}>CTA text</span>
        <input
          className={inputClass}
          name="ctaText"
          defaultValue={header.ctaText}
        />
      </label>
      <label>
        <span className={labelClass}>CTA URL</span>
        <input
          className={inputClass}
          name="ctaUrl"
          defaultValue={header.ctaUrl}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          name="stickyHeader"
          type="checkbox"
          defaultChecked={header.stickyHeader}
          className="h-4 w-4 accent-navy"
        />
        <span className="text-sm">Sticky header</span>
      </label>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save header"}
      </button>
    </form>
  );
}

export function FooterForm({
  footer,
  media,
}: {
  footer: {
    logoId: string | null;
    description: string;
    copyrightText: string;
    newsletterEnabled: boolean;
    newsletterTitle: string;
    newsletterDescription: string;
    contactInformationJson: Record<string, string>;
    socialLinksJson: { network: string; url: string }[];
  };
  media: MediaItem[];
}) {
  const [state, action, pending] = useActionState(saveFooterAction, null);
  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-line bg-white p-4"
    >
      <ErrorNote error={state?.error} />
      <div>
        <span className={labelClass}>Logo</span>
        <MediaPicker
          name="logoId"
          initialIds={footer.logoId ? [footer.logoId] : []}
          known={media}
        />
      </div>
      <label>
        <span className={labelClass}>Description</span>
        <textarea
          className={inputClass}
          name="description"
          rows={4}
          defaultValue={footer.description}
        />
      </label>
      <div className="rounded-md border border-line bg-paper px-3 py-3 text-sm">
        <p className="font-semibold text-navy">Footer links</p>
        <p className="mt-1 text-muted">
          Add, edit, reorder, or remove the Links column from the Navigation
          CMS screen. Set a link location to <strong>Footer</strong>.
        </p>
        <a
          href="/admin/nav-links"
          className="mt-2 inline-block font-semibold text-navy underline underline-offset-2"
        >
          Manage footer links
        </a>
      </div>
      <label>
        <span className={labelClass}>Copyright</span>
        <input
          className={inputClass}
          name="copyrightText"
          defaultValue={footer.copyrightText}
        />
      </label>
      <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-navy">Footer contact</p>
          <p className="mt-1 text-xs text-muted">
            These details appear only in the website footer.
          </p>
        </div>
        <label className="md:col-span-2">
          <span className={labelClass}>Address</span>
          <textarea
            className={inputClass}
            name="contactAddress"
            rows={3}
            defaultValue={footer.contactInformationJson.address ?? ""}
          />
        </label>
        <label>
          <span className={labelClass}>Primary email</span>
          <input
            className={inputClass}
            name="contactEmail"
            type="email"
            defaultValue={footer.contactInformationJson.email ?? ""}
          />
        </label>
        <label>
          <span className={labelClass}>Secondary email</span>
          <input
            className={inputClass}
            name="contactEmailSecondary"
            type="email"
            defaultValue={footer.contactInformationJson.emailSecondary ?? ""}
          />
        </label>
        <label>
          <span className={labelClass}>Phone / mobile number</span>
          <input
            className={inputClass}
            name="contactPhone"
            type="tel"
            defaultValue={footer.contactInformationJson.phone ?? ""}
          />
        </label>
      </div>
      <label>
        <span className={labelClass}>Social links</span>
        <textarea
          className={inputClass}
          name="socialLinks"
          rows={4}
          defaultValue={footer.socialLinksJson
            .map((link) => `${link.network} | ${link.url}`)
            .join("\n")}
          placeholder={
            "YouTube | https://youtube.com/...\nFacebook | https://facebook.com/..."
          }
        />
        <span className="mt-1 block text-xs text-muted">
          One link per line: Network name | full URL
        </span>
      </label>
      <label className="flex items-center gap-2">
        <input
          name="newsletterEnabled"
          type="checkbox"
          defaultChecked={footer.newsletterEnabled}
          className="h-4 w-4 accent-navy"
        />
        <span className="text-sm">Newsletter enabled</span>
      </label>
      <label>
        <span className={labelClass}>Newsletter title</span>
        <input
          className={inputClass}
          name="newsletterTitle"
          defaultValue={footer.newsletterTitle}
        />
      </label>
      <label>
        <span className={labelClass}>Newsletter description</span>
        <textarea
          className={inputClass}
          name="newsletterDescription"
          rows={2}
          defaultValue={footer.newsletterDescription}
        />
      </label>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save footer"}
      </button>
    </form>
  );
}

export function ContactSettingsForm({
  contact,
}: {
  contact: {
    title: string;
    subtitle: string;
    description: string;
    address: string;
    email: string;
    emailSecondary: string;
    detailsEyebrow: string;
    detailsTitle: string;
    formTitle: string;
    formDescription: string;
    phone: string;
    whatsapp: string;
    mapUrl: string | null;
    mapEmbed: string | null;
    latitude: string | null;
    longitude: string | null;
    businessHours: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveContactSettingsAction,
    null,
  );
  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-line bg-white p-4"
    >
      <ErrorNote error={state?.error} />
      <label>
        <span className={labelClass}>Title</span>
        <input
          className={inputClass}
          name="title"
          defaultValue={contact.title}
        />
      </label>
      <label>
        <span className={labelClass}>Subtitle</span>
        <input
          className={inputClass}
          name="subtitle"
          defaultValue={contact.subtitle}
        />
      </label>
      <label>
        <span className={labelClass}>Description</span>
        <textarea
          className={inputClass}
          name="description"
          rows={3}
          defaultValue={contact.description}
        />
      </label>
      <label>
        <span className={labelClass}>Address</span>
        <textarea
          className={inputClass}
          name="address"
          rows={3}
          defaultValue={contact.address}
        />
      </label>
      <label>
        <span className={labelClass}>Primary email</span>
        <input
          className={inputClass}
          name="email"
          type="email"
          defaultValue={contact.email}
        />
      </label>
      <label>
        <span className={labelClass}>Secondary email</span>
        <input
          className={inputClass}
          name="emailSecondary"
          type="email"
          defaultValue={contact.emailSecondary}
        />
      </label>
      <label>
        <span className={labelClass}>Contact details eyebrow</span>
        <input
          className={inputClass}
          name="detailsEyebrow"
          defaultValue={contact.detailsEyebrow}
        />
      </label>
      <label>
        <span className={labelClass}>Contact details heading</span>
        <input
          className={inputClass}
          name="detailsTitle"
          defaultValue={contact.detailsTitle}
        />
      </label>
      <label>
        <span className={labelClass}>Form heading</span>
        <input
          className={inputClass}
          name="formTitle"
          defaultValue={contact.formTitle}
        />
      </label>
      <label>
        <span className={labelClass}>Form description</span>
        <textarea
          className={inputClass}
          name="formDescription"
          rows={2}
          defaultValue={contact.formDescription}
        />
      </label>
      <label>
        <span className={labelClass}>Phone</span>
        <input
          className={inputClass}
          name="phone"
          defaultValue={contact.phone}
        />
      </label>
      <label>
        <span className={labelClass}>WhatsApp</span>
        <input
          className={inputClass}
          name="whatsapp"
          defaultValue={contact.whatsapp}
        />
      </label>
      <label>
        <span className={labelClass}>Map URL</span>
        <input
          className={inputClass}
          name="mapUrl"
          defaultValue={contact.mapUrl ?? ""}
        />
      </label>
      <label>
        <span className={labelClass}>Map embed HTML</span>
        <textarea
          className={inputClass}
          name="mapEmbed"
          rows={3}
          defaultValue={contact.mapEmbed ?? ""}
        />
      </label>
      <label>
        <span className={labelClass}>Business hours</span>
        <textarea
          className={inputClass}
          name="businessHours"
          rows={2}
          defaultValue={contact.businessHours}
        />
      </label>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save contact settings"}
      </button>
    </form>
  );
}
