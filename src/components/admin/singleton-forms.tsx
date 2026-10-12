"use client";

import { useActionState, useState } from "react";
import {
  ClientsEditor,
  RelationManyField,
  StatsEditor,
  StrengthsEditor,
  TestimonialsEditor,
  UspsEditor,
  WhyEditor,
} from "@/components/admin/editors";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { helpClass, inputClass, labelClass, primaryButtonClass } from "@/components/admin/styles";
import { saveHomeAction, saveSettingsAction } from "@/lib/cms/actions";
import type { MediaItem } from "@/lib/cms/queries";
import type { ClientItem, StatItem, StrengthItem, TestimonialItem, UspItem, WhyItem } from "@/db/schema";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>;
}

function ShowcasePathsField({ name, initial }: { name: string; initial: string[] }) {
  const [value, setValue] = useState(initial.join("\n"));
  const paths = value
    .split("\n")
    .map((line) => line.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return (
    <>
      <textarea
        className={inputClass}
        rows={4}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={"hydraulic-power-pack\nhydraulic-cylinder-manufacturers"}
      />
      <input type="hidden" name={name} value={JSON.stringify(paths)} />
      <span className={helpClass}>One category path per line (no leading slash). Leave empty to use WordPress import order or seed defaults.</span>
    </>
  );
}

export function SettingsForm({
  settings,
  media,
}: {
  settings: {
    companyName: string;
    logoId: string | null;
    phonePrimary: string;
    phoneSecondary: string | null;
    emailPrimary: string;
    emailSecondary: string | null;
    enquiryToEmail: string;
    address: string;
    whatsapp: string | null;
    youtubeUrl: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    linkedinUrl: string | null;
    catalogueId: string | null;
    footerText: string;
    mapUrl: string | null;
    gtranslateEnabled: boolean;
    quoteCtaLabel: string;
    quoteCtaHref: string;
  };
  media: MediaItem[];
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);

  return (
    <form action={action} className="space-y-6">
      <ErrorNote error={state?.error} />
      <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
        <label>
          <span className={labelClass}>Company name</span>
          <input className={inputClass} name="companyName" defaultValue={settings.companyName} required />
        </label>
        <div className="md:col-span-2">
          <span className={labelClass}>Logo</span>
          <MediaPicker name="logoId" initialIds={settings.logoId ? [settings.logoId] : []} known={media} />
        </div>
        <label>
          <span className={labelClass}>Primary phone</span>
          <input className={inputClass} name="phonePrimary" defaultValue={settings.phonePrimary} required />
        </label>
        <label>
          <span className={labelClass}>Secondary phone</span>
          <input className={inputClass} name="phoneSecondary" defaultValue={settings.phoneSecondary ?? ""} />
        </label>
        <label>
          <span className={labelClass}>Primary email</span>
          <input className={inputClass} name="emailPrimary" type="email" defaultValue={settings.emailPrimary} required />
        </label>
        <label>
          <span className={labelClass}>Secondary email</span>
          <input className={inputClass} name="emailSecondary" type="email" defaultValue={settings.emailSecondary ?? ""} />
        </label>
        <label>
          <span className={labelClass}>Enquiry inbox</span>
          <input className={inputClass} name="enquiryToEmail" type="email" defaultValue={settings.enquiryToEmail} required />
          <span className={helpClass}>Where quote and contact emails will be sent.</span>
        </label>
        <label>
          <span className={labelClass}>WhatsApp number</span>
          <input className={inputClass} name="whatsapp" defaultValue={settings.whatsapp ?? ""} />
          <span className={helpClass}>Country code, digits only. Example: 919541424317</span>
        </label>
        <label className="md:col-span-2">
          <span className={labelClass}>Address</span>
          <textarea className={inputClass} name="address" rows={3} defaultValue={settings.address} required />
        </label>
        <label className="md:col-span-2">
          <span className={labelClass}>Map link</span>
          <input className={inputClass} name="mapUrl" defaultValue={settings.mapUrl ?? ""} placeholder="https://" />
        </label>
        <label>
          <span className={labelClass}>YouTube</span>
          <input className={inputClass} name="youtubeUrl" defaultValue={settings.youtubeUrl ?? ""} placeholder="https://" />
        </label>
        <label>
          <span className={labelClass}>Facebook</span>
          <input className={inputClass} name="facebookUrl" defaultValue={settings.facebookUrl ?? ""} placeholder="https://" />
        </label>
        <label>
          <span className={labelClass}>Instagram</span>
          <input className={inputClass} name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} placeholder="https://" />
        </label>
        <label>
          <span className={labelClass}>LinkedIn</span>
          <input className={inputClass} name="linkedinUrl" defaultValue={settings.linkedinUrl ?? ""} placeholder="https://" />
        </label>
        <div className="md:col-span-2">
          <span className={labelClass}>Catalogue PDF</span>
          <MediaPicker name="catalogueId" initialIds={settings.catalogueId ? [settings.catalogueId] : []} known={media} />
        </div>
        <label className="md:col-span-2">
          <span className={labelClass}>Footer text</span>
          <textarea className={inputClass} name="footerText" rows={3} defaultValue={settings.footerText} />
        </label>
        <label>
          <span className={labelClass}>Quote button label</span>
          <input className={inputClass} name="quoteCtaLabel" defaultValue={settings.quoteCtaLabel} required />
        </label>
        <label>
          <span className={labelClass}>Quote button link</span>
          <input className={inputClass} name="quoteCtaHref" defaultValue={settings.quoteCtaHref} required />
        </label>
        <label className="flex items-center gap-2 md:col-span-2">
          <input name="gtranslateEnabled" type="checkbox" defaultChecked={settings.gtranslateEnabled} className="h-4 w-4 accent-navy" />
          <span className="text-sm">Show the GTranslate widget. Hindi content stays a later CMS locale.</span>
        </label>
      </section>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

export function HomeForm({
  home,
  media,
  products,
}: {
  home: {
    heroEyebrow: string;
    heroHeadline: string;
    heroSubcopy: string;
    heroMediaIds: string[];
    clientLogos: ClientItem[];
    testimonials: TestimonialItem[];
    strengths: StrengthItem[];
    stats: StatItem[];
    usps: UspItem[];
    customBandTitle: string;
    customBandEyebrow: string;
    customBandBody: string;
    customBandButtonText: string;
    customBandButtonHref: string;
    aboutTitle: string;
    aboutBody: string;
    aboutMediaId: string | null;
    aboutPillars: WhyItem[];
    showcaseCategoryPaths: string[];
    featuredProductIds: string[];
    whyChooseTitle: string;
    whyChooseIntro: string;
    whyChooseUs: WhyItem[];
    visionTitle: string;
    visionBody: string;
    missionTitle: string;
    missionBody: string;
  };
  media: MediaItem[];
  products: { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(saveHomeAction, null);

  return (
    <form action={action} className="space-y-6">
      <ErrorNote error={state?.error} />
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Banner Slider & Hero</h2>
        <label className="block">
          <span className={labelClass}>Eyebrow</span>
          <input className={inputClass} name="heroEyebrow" defaultValue={home.heroEyebrow} placeholder="About us" />
        </label>
        <label className="block">
          <span className={labelClass}>Headline</span>
          <input className={inputClass} name="heroHeadline" defaultValue={home.heroHeadline} />
        </label>
        <label className="block">
          <span className={labelClass}>Subcopy</span>
          <textarea className={inputClass} name="heroSubcopy" rows={3} defaultValue={home.heroSubcopy} />
        </label>
        <div>
          <span className={labelClass}>Banner images (Carousel Slides)</span>
          <p className="mb-2 text-xs text-muted">Upload or select images, reorder/remove them, then click Save banners below. Only this saved list appears on the homepage.</p>
          <MediaPicker name="heroMediaIds" multiple initialIds={home.heroMediaIds} known={media} />
        </div>
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "Saving banners…" : "Save banners"}
        </button>
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Trust Strip & Badges (5 Strengths)</h2>
          <p className="mt-1 text-xs text-muted">Company strength badges shown below the banner slider (e.g. High Quality Manufacturing, Pan India Supply).</p>
        </div>
        <StrengthsEditor name="strengths" initial={home.strengths} />
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Our Clients (Brand Logos & Names)</h2>
          <p className="mt-1 text-xs text-muted">Change, edit, reorder, or delete client brand names and logos shown in the scrolling rail on the homepage.</p>
        </div>
        <ClientsEditor name="clientLogos" initial={home.clientLogos} />
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">About</h2>
        <label className="block">
          <span className={labelClass}>Title</span>
          <input className={inputClass} name="aboutTitle" defaultValue={home.aboutTitle} />
        </label>
        <div>
          <span className={labelClass}>Body</span>
          <RichTextEditor name="aboutBody" defaultValue={home.aboutBody} />
        </div>
        <div>
          <span className={labelClass}>Image</span>
          <MediaPicker name="aboutMediaId" initialIds={home.aboutMediaId ? [home.aboutMediaId] : []} known={media} />
        </div>
        <div>
          <span className={labelClass}>About pillars (01–03)</span>
          <WhyEditor name="aboutPillars" initial={home.aboutPillars} />
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Home category grids</h2>
        <div>
          <span className={labelClass}>Category paths</span>
          <ShowcasePathsField name="showcaseCategoryPaths" initial={home.showcaseCategoryPaths} />
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Featured products</h2>
        <RelationManyField name="featuredProductIds" options={products} initialIds={home.featuredProductIds} />
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Why choose us</h2>
        <label className="block">
          <span className={labelClass}>Section title</span>
          <input className={inputClass} name="whyChooseTitle" defaultValue={home.whyChooseTitle} />
        </label>
        <label className="block">
          <span className={labelClass}>Intro paragraph</span>
          <textarea className={inputClass} name="whyChooseIntro" rows={4} defaultValue={home.whyChooseIntro} />
        </label>
        <WhyEditor name="whyChooseUs" initial={home.whyChooseUs} />
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Custom Solutions Banner</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Banner Eyebrow</span>
            <input className={inputClass} name="customBandEyebrow" defaultValue={home.customBandEyebrow} placeholder="Made around your application" />
          </label>
          <label className="block">
            <span className={labelClass}>Banner Title</span>
            <input className={inputClass} name="customBandTitle" defaultValue={home.customBandTitle} placeholder="Custom Hydraulic Solutions for Every Industry" />
          </label>
        </div>
        <label className="block">
          <span className={labelClass}>Banner Description</span>
          <textarea className={inputClass} name="customBandBody" rows={3} defaultValue={home.customBandBody} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Button Text</span>
            <input className={inputClass} name="customBandButtonText" defaultValue={home.customBandButtonText} placeholder="Get a custom solution" />
          </label>
          <label className="block">
            <span className={labelClass}>Button Link (URL)</span>
            <input className={inputClass} name="customBandButtonHref" defaultValue={home.customBandButtonHref} placeholder="/contact/" />
          </label>
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Stats Strip (Counters)</h2>
          <p className="mt-1 text-xs text-muted">Numbers and statistics shown with counter animation (e.g. 12+ Years, 1000+ Products, 500+ Clients).</p>
        </div>
        <StatsEditor name="stats" initial={home.stats} />
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Our USPs (Points 01–05)</h2>
          <p className="mt-1 text-xs text-muted">Unique Selling Propositions with checkmarks shown on the homepage.</p>
        </div>
        <UspsEditor name="usps" initial={home.usps} />
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Customer Testimonials & Feedback</h2>
          <p className="mt-1 text-xs text-muted">Manage testimonials shown in &ldquo;What Our Customers Say&rdquo; section on the homepage. Edit quotes, author names/companies, reorder, or add new ones.</p>
        </div>
        <TestimonialsEditor name="testimonials" initial={home.testimonials} />
      </section>
      <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
        <label>
          <span className={labelClass}>Vision title</span>
          <input className={inputClass} name="visionTitle" defaultValue={home.visionTitle} />
        </label>
        <label>
          <span className={labelClass}>Mission title</span>
          <input className={inputClass} name="missionTitle" defaultValue={home.missionTitle} />
        </label>
        <label>
          <span className={labelClass}>Vision</span>
          <textarea className={inputClass} name="visionBody" rows={5} defaultValue={home.visionBody} />
        </label>
        <label>
          <span className={labelClass}>Mission</span>
          <textarea className={inputClass} name="missionBody" rows={5} defaultValue={home.missionBody} />
        </label>
      </section>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save home page"}
      </button>
    </form>
  );
}
