export function emptyPageInitial(): Record<string, unknown> {
  return {
    status: "draft",
    pageType: "custom",
    title: "",
    slug: "",
    path: "",
    excerpt: "",
    shortDescription: "",
    body: "",
    heroMediaId: null,
    featuredImageId: null,
    seoTitle: "",
    seoDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImageId: null,
    twitterTitle: "",
    twitterDescription: "",
    twitterImageId: null,
    breadcrumbsEnabled: true,
  };
}

export function mergePageInitial(initial: Record<string, unknown>) {
  return { ...emptyPageInitial(), ...initial };
}
