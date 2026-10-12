import { Notice, PageHeader } from "@/components/admin/page-header";
import { HomeForm } from "@/components/admin/singleton-forms";
import { getHome, mediaItems, relationOptions } from "@/lib/cms/queries";

export default async function HomeEditorPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  const home = await getHome();
  const [media, products] = await Promise.all([
    mediaItems([...home.heroMediaIds, home.aboutMediaId].filter((id): id is string => Boolean(id))),
    relationOptions("products"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Globals"
        title="Home page"
        description="Hero, about blurb, featured products, and the why-choose-us items. The latest three posts are chosen automatically when the public home is built."
      />
      {params.saved ? <Notice tone="ok">Home page saved.</Notice> : null}
      <HomeForm
        home={{
          heroEyebrow: home.heroEyebrow,
          heroHeadline: home.heroHeadline,
          heroSubcopy: home.heroSubcopy,
          heroMediaIds: home.heroMediaIds,
          clientLogos: home.clientLogos ?? [],
          testimonials: home.testimonials ?? [],
          strengths: home.strengths ?? [],
          stats: home.stats ?? [],
          usps: home.usps ?? [],
          customBandTitle: home.customBandTitle ?? "",
          customBandEyebrow: home.customBandEyebrow ?? "",
          customBandBody: home.customBandBody ?? "",
          customBandButtonText: home.customBandButtonText ?? "",
          customBandButtonHref: home.customBandButtonHref ?? "",
          aboutTitle: home.aboutTitle,
          aboutBody: home.aboutBody,
          aboutMediaId: home.aboutMediaId,
          aboutPillars: home.aboutPillars ?? [],
          showcaseCategoryPaths: home.showcaseCategoryPaths ?? [],
          featuredProductIds: home.featuredProductIds,
          whyChooseTitle: home.whyChooseTitle,
          whyChooseIntro: home.whyChooseIntro,
          whyChooseUs: home.whyChooseUs ?? [],
          visionTitle: home.visionTitle,
          visionBody: home.visionBody,
          missionTitle: home.missionTitle,
          missionBody: home.missionBody,
        }}
        media={media}
        products={products}
      />
    </>
  );
}
