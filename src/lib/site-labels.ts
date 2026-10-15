export const siteLabelDefaults = {
  blogEyebrow: "Knowledge centre",
  blogTitle: "Insights & Articles",
  blogSearchPlaceholder: "Search articles...",
  blogLatestEyebrow: "Latest from Jyoti Hydraulic",
  blogLatestTitle: "Engineering Knowledge, Made Practical",
  blogLatestDescription:
    "Stay informed with product explainers, maintenance advice and industry updates.",
  productsTitle: "Our Products",
  productsSubtitle: "ISO-9001:2015 Certified Company",
  productsDescription:
    "Discover our complete range of hydraulic products designed for various industrial applications.",
  catalogueEyebrow: "Technical resources",
  catalogueTitle: "Product Catalogues",
  catalogueDescription:
    "Access product ranges, technical specifications and engineering information in one place.",
  catalogueSectionEyebrow: "Download centre",
  catalogueSectionTitle: "Explore Our Technical Library",
  catalogueSectionDescription:
    "Select a document to learn more about our products, applications and specifications.",
  contactEyebrow: "Get in touch",
  mapEyebrow: "Visit our facility",
  mapTitle: "Find Jyoti Hydraulic",
  footerLinksTitle: "Links",
  footerContactTitle: "Contact",
  footerNewsletterTitle: "Newsletter",
  productOverviewEyebrow: "Product overview",
  productOverviewLabel: "Overview",
  productSpecificationsLabel: "Specifications",
  productFeaturesLabel: "Features",
  productRelatedTitle: "Related Products",
  productComingSoonTitle: "Coming soon",
  productComingSoonDescription:
    "We’re preparing this product information. Please check back soon.",
  productVideoLabel: "Video",
  productReviewsLabel: "Reviews",
  notFoundTitle: "This page is not available",
  notFoundDescription:
    "The link may be out of date. Browse the product range, or send a quote request and the team will point you to the right machine.",
  notFoundHomeLabel: "Home",
  notFoundProductsLabel: "Products",
  notFoundContactLabel: "Contact",
};
export type SiteLabels = typeof siteLabelDefaults;
export function withSiteLabelDefaults(value: unknown): SiteLabels {
  return {
    ...siteLabelDefaults,
    ...(value && typeof value === "object" ? value : {}),
  } as SiteLabels;
}
