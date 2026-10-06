import type { WhyItem } from "@/db/schema";

/** Seed defaults only. The live site reads company and home copy from Postgres via the CMS. */
export const brand = {
  companyName: "Jyoti Hydraulic",
  siteUrl: "https://jyotihydraulic.com",
  phonePrimary: "+91 9541424317",
  emailPrimary: "info@jyotihydraulic.com",
  emailSecondary: "jyotihydraulic@gmail.com",
  address: "Plot No. 01 & 02, Sector-57, Faridabad-121004, Haryana, India",
  whatsapp: "919541424317",
  footerText:
    "Established in 2014, Faridabad, India. Leading manufacturer of hydraulic equipment, jigs, and fixtures.",
  quoteCtaLabel: "Get a free quote",
  quoteCtaHref: "/contact/",
};

export const aboutPillars = [
  {
    title: "Comprehensive Range",
    body: "Discover our wide range of premium hydraulic products, expertly crafted to support various industrial applications with precision and reliability.",
  },
  {
    title: "Precision Engineering",
    body: "Crafted with expert precision, our hydraulic solutions are designed to deliver exceptional performance and long-lasting durability in every application.",
  },
  {
    title: "Tailored Solutions",
    body: "From high-quality standard components to custom-engineered hydraulic systems, we deliver tailored solutions designed to meet your exact specifications.",
  },
] satisfies WhyItem[];

export const homeDefaults = {
  heroEyebrow: "About us",
  heroHeadline: "Welcome to Jyoti Hydraulic",
  heroSubcopy: "",
  aboutTitle: "Welcome to Jyoti Hydraulic",
  aboutBody:
    "<p>Jyoti Hydraulic is committed to delivering advanced hydraulic solutions tailored to meet diverse industrial requirements. With a strong focus on quality, reliability, and customer satisfaction, we specialize in the design and manufacturing of a wide range of high-performance hydraulic components.</p>",
  aboutPillars,
  showcaseCategoryPaths: [] as string[],
  whyChooseTitle: "Elevate Your Operations with Hydraulic Power Packs",
  whyChooseIntro:
    "Unlock exceptional efficiency and reliability with our cutting-edge hydraulic power packs. Engineered for the toughest industrial demands, our solutions deliver seamless performance, helping you maximize productivity and streamline operations with ease.",
  whyChooseUs: [
    {
      title: "Unmatched Quality and Durability",
      body: "Built to the highest quality standards, our products deliver exceptional durability and reliability. Using premium materials and cutting-edge manufacturing techniques, we create hydraulic solutions engineered to perform flawlessly in even the toughest conditions.",
    },
    {
      title: "Exceptional Customer Support",
      body: "We are committed to delivering outstanding customer service at every step. Our team of experienced professionals is always ready to assist you with product selection, technical guidance, and after-sales support. Your satisfaction remains our top priority.",
    },
    {
      title: "Innovative Engineering",
      body: "Our dedication to innovation fuels our mission to continuously enhance and expand our product range. By investing in research and development, we deliver cutting-edge hydraulic solutions designed to boost efficiency and maximize productivity.",
    },
  ] satisfies WhyItem[],
  visionTitle: "Vision",
  visionBody:
    "Our vision is to be a globally recognized leader in hydraulic solutions. We set industry benchmarks through innovation, reliability, and customer-driven engineering, and we build partnerships that keep equipment working.",
  missionTitle: "Mission",
  missionBody:
    "At Jyoti Hydraulic Faridabad, our mission is to keep advancing hydraulic products for the work our customers actually do. Quality, reliability, and clear technical support come before everything else.",
};
