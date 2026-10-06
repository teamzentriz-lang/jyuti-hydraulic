import Link from "next/link";
import { ContactSection } from "@/components/site/contact-section";
import { CmsImage } from "@/components/site/cms-image";
import { OpenPdfInNewTab } from "@/components/site/open-pdf-tab";
import { PageSectionsView } from "@/components/site/page-sections-view";
import { ProductCard } from "@/components/site/product-card";
import { RichTextHtml } from "@/components/site/rich-text-html";
import type { PublishedContent } from "@/lib/cms/published-content";
import { publicPath } from "@/lib/paths";

export function ContentView({
  content,
  cataloguePdfUrl = null,
}: {
  content: PublishedContent;
  cataloguePdfUrl?: string | null;
}) {
  const isContact = content.kind === "page" && content.path === "contact";
  const isCatalogue = content.kind === "page" && content.path === "catalogue";

  return (
    <main>
      <div className="site-page-banner">
        <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-6">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{content.title}</h1>
          {content.summary ? <p className="mt-3 max-w-3xl text-base leading-7 text-white/85">{content.summary}</p> : null}
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-6">
      {content.hero ? (
        <CmsImage item={content.hero} alt={content.title} className="mb-8 w-full rounded-sm border border-line object-cover" />
      ) : null}
      {content.cover ? (
        <CmsImage item={content.cover} alt={content.title} className="mb-8 w-full rounded-lg border border-line object-cover" />
      ) : null}
      {content.image ? (
        <CmsImage item={content.image} alt={content.title} className="mb-8 max-h-80 w-full rounded-lg border border-line object-cover" />
      ) : null}

      {content.meta?.locationName ? (
        <p className="mt-2 text-sm text-muted">
          {content.meta.locationName}
          {content.meta.region ? ` · ${content.meta.region}` : ""}
        </p>
      ) : null}
      {content.meta?.country ? (
        <p className="mt-2 text-sm text-muted">
          {content.meta.country}
          {content.meta.productLine ? ` · ${content.meta.productLine}` : ""}
        </p>
      ) : null}

      {content.body.trim() ? <RichTextHtml html={content.body} className="rich-text mt-8 max-w-3xl" /> : null}

      {isCatalogue && cataloguePdfUrl ? (
        <section className="mt-8 max-w-3xl">
          <OpenPdfInNewTab url={cataloguePdfUrl} />
          <a
            href={cataloguePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-md bg-signal px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b9151b]"
          >
            Open catalogue (PDF)
          </a>
          <p className="mt-2 text-sm text-muted">The catalogue opens in a new tab. If it did not open, use the button above.</p>
        </section>
      ) : null}

      {content.detailBlocks?.map((block) => (
        <section key={block.heading} className="mt-10 max-w-3xl">
          <h2 className="text-xl font-semibold text-navy">{block.heading}</h2>
          <RichTextHtml html={block.html} className="rich-text mt-4" />
        </section>
      ))}

      {content.features?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">Features</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {content.features.map((item, index) => (
              <li key={`${item.title}-${index}`} className="rounded-lg border border-line p-4">
                {item.image ? (
                  <CmsImage item={item.image} alt={item.title} className="mb-3 aspect-video w-full rounded-md object-cover" />
                ) : item.icon ? (
                  <CmsImage item={item.icon} alt="" className="mb-3 h-10 w-10 object-contain" />
                ) : null}
                {item.title ? <h3 className="font-semibold text-navy">{item.title}</h3> : null}
                {item.description ? <p className="mt-2 text-sm text-muted">{item.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.applications?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">Applications</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {content.applications.map((item, index) => (
              <li key={`${item.title}-${index}`} className="rounded-lg border border-line p-4">
                {item.image ? (
                  <CmsImage item={item.image} alt={item.title} className="mb-3 aspect-video w-full rounded-md object-cover" />
                ) : null}
                {item.title ? <h3 className="font-semibold text-navy">{item.title}</h3> : null}
                {item.description ? <p className="mt-2 text-sm text-muted">{item.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.specs?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">Specifications</h2>
          <table className="mt-4 w-full max-w-3xl border-collapse text-sm">
            <tbody>
              {content.specs.map((row) => (
                <tr key={`${row.label}-${row.value}`}>
                  <th className="border border-line bg-paper px-3 py-2 text-left font-semibold">{row.label}</th>
                  <td className="border border-line px-3 py-2">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {content.gallery?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">Gallery</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.gallery.map((item) => (
              <CmsImage key={item.id} item={item} className="aspect-[4/3] w-full rounded-lg border border-line object-cover" />
            ))}
          </div>
        </section>
      ) : null}

      {content.technicalTables?.map((table) => (
        <section key={table.tableTitle} className="mt-12">
          <h2 className="text-xl font-semibold text-navy">{table.tableTitle || "Technical data"}</h2>
          <div className="mt-4 max-w-4xl overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              {table.columns.length ? (
                <thead>
                  <tr>
                    {table.columns.map((column) => (
                      <th key={column} className="border border-line bg-paper px-3 py-2 text-left font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-line px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {content.contentTables?.map((table) => (
        <section key={table.title} className="mt-12">
          <h2 className="text-xl font-semibold text-navy">{table.title || "Table"}</h2>
          {table.caption ? <p className="mt-2 text-sm text-muted">{table.caption}</p> : null}
          <div className="mt-4 max-w-4xl overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              {table.headers.length ? (
                <thead>
                  <tr>
                    {table.headers.map((header) => (
                      <th key={header} className="border border-line bg-paper px-3 py-2 text-left font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-line px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {content.documents?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">Downloads</h2>
          <ul className="mt-4 space-y-2">
            {content.documents.map((doc, index) => (
              <li key={`${doc.title}-${index}`}>
                {doc.url ? (
                  <a href={doc.url} className="font-semibold text-navy hover:underline" target="_blank" rel="noopener noreferrer">
                    {doc.title || "Download"}
                  </a>
                ) : (
                  <span className="text-muted">{doc.title}</span>
                )}
                {doc.description ? <p className="text-sm text-muted">{doc.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.faqs?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">FAQs</h2>
          <dl className="mt-4 max-w-3xl space-y-4">
            {content.faqs.map((item, index) => (
              <div key={`${item.question}-${index}`} className="rounded-lg border border-line p-4">
                <dt className="font-semibold text-navy">{item.question}</dt>
                <dd className="rich-text mt-2 text-sm text-muted">
                  <RichTextHtml html={item.answer} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {content.sections?.length ? <PageSectionsView sections={content.sections} /> : null}

      {content.childCategories?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">Subcategories</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {content.childCategories.map((item) => (
              <li key={item.id} className="rounded-lg border border-line p-4">
                <Link href={publicPath(item.path)} className="font-semibold text-navy hover:underline">
                  {item.title}
                </Link>
                {item.summary ? <p className="mt-2 text-sm text-muted">{item.summary}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.categoryProducts?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-navy">Products</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.categoryProducts.map((item) => (
              <li key={item.id}>
                <ProductCard
                  title={item.title}
                  path={item.path}
                  summary={item.summary}
                  imageUrl={item.imageUrl}
                  imageAlt={item.imageAlt}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isContact ? <ContactSection /> : null}

      {content.kind === "product" ? (
        <section className="mt-12 flex flex-wrap gap-4 border-t border-line pt-8">
          <Link
            href="/contact/"
            className="rounded-md bg-signal px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b9151b]"
          >
            Contact us
          </Link>
          <Link
            href="/contact/"
            className="rounded-md border border-line px-5 py-2.5 text-sm font-semibold text-navy hover:bg-paper"
          >
            Get a free quote
          </Link>
        </section>
      ) : null}

      {content.related?.length ? (
        <section className="mt-12 border-t border-line pt-12">
          <h2 className="text-xl font-semibold text-navy">Related products</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {content.related.map((item) => (
              <li key={item.id}>
                <Link href={publicPath(item.path)} className="font-semibold text-navy hover:underline">
                  {item.title}
                </Link>
                {item.summary ? <p className="mt-1 text-sm text-muted">{item.summary}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </div>
    </main>
  );
}

export function contentMetadata(content: PublishedContent, companyName: string) {
  const title = content.seoTitle || content.title;
  const description = content.seoDescription || content.summary || undefined;
  return {
    title,
    description,
    openGraph: { title, description, siteName: companyName },
  };
}
