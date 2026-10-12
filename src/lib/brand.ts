import type { ClientItem, StatItem, StrengthItem, TestimonialItem, UspItem, WhyItem } from "@/db/schema";

/** Seed defaults only. The live site reads company and home copy from Postgres via the CMS. */
type BrandSettings = {
  companyName: string;
  phonePrimary: string;
  emailPrimary: string;
  emailSecondary: string | null;
  address: string;
  whatsapp: string | null;
  footerText: string;
  quoteCtaLabel: string;
  quoteCtaHref: string;
};

export function withBrandDefaults<T extends BrandSettings>(settings: T): T {
  const text = (value: string | null | undefined, fallback: string) => value?.trim() || fallback;
  return {
    ...settings,
    companyName: text(settings.companyName, brand.companyName),
    phonePrimary: text(settings.phonePrimary, brand.phonePrimary),
    emailPrimary: text(settings.emailPrimary, brand.emailPrimary),
    emailSecondary: text(settings.emailSecondary, brand.emailSecondary),
    address: text(settings.address, brand.address),
    whatsapp: text(settings.whatsapp, brand.whatsapp),
    footerText: text(settings.footerText, brand.footerText),
    quoteCtaLabel: text(settings.quoteCtaLabel, brand.quoteCtaLabel),
    quoteCtaHref: text(settings.quoteCtaHref, brand.quoteCtaHref),
  };
}

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

export const defaultClients: ClientItem[] = [
  { name: "Konica Minolta", logo: "/clients/konica-minolta.jpg" },
  { name: "Crompton", logo: "/clients/crompton.jpg" },
  { name: "Maruti Suzuki", logo: "/clients/maruti-suzuki.jpg" },
  { name: "Nestlé", logo: "/clients/nestle.jpg" },
  { name: "Philips", logo: "/clients/philips.jpg" },
  { name: "Tupperware", logo: "/clients/tupperware.jpg" },
  { name: "Surya", logo: "/clients/surya.jpg" },
  { name: "Honda", logo: "/clients/honda.jpg" },
  { name: "JCB", logo: "/clients/jcb.jpg" },
  { name: "Campus", logo: "/clients/campus.jpg" },
];

export const defaultTestimonials: TestimonialItem[] = [
  {
    quote:
      "The team understood our application quickly and recommended a practical hydraulic solution that integrated smoothly with our equipment.",
    author: "Industrial equipment customer",
  },
  {
    quote:
      "Clear technical communication, dependable product quality and responsive support made the entire procurement process straightforward.",
    author: "Manufacturing customer",
  },
  {
    quote:
      "Jyoti Hydraulic has been a reliable partner for custom requirements, delivery coordination and after-sales assistance.",
    author: "OEM customer",
  },
];

export const defaultStrengths: StrengthItem[] = [
  { icon: "quality", title: "High Quality", subtitle: "Manufacturing" },
  { icon: "custom", title: "Custom-Built", subtitle: "Solutions" },
  { icon: "supply", title: "Pan India", subtitle: "Supply" },
  { icon: "support", title: "Technical", subtitle: "Support" },
  { icon: "trusted", title: "Trusted by", subtitle: "Industries" },
];

export const defaultStats: StatItem[] = [
  { value: "12+", label: "Years of Experience" },
  { value: "1000+", label: "Products Delivered" },
  { value: "500+", label: "Happy Clients" },
  { value: "Pan India", label: "Supply Network" },
];

export const defaultUsps: UspItem[] = [
  {
    number: "01",
    title: "Application-first engineering",
    body: "Hydraulic systems selected and configured around real operating requirements.",
  },
  {
    number: "02",
    title: "Pan-India supply",
    body: "Reliable product availability and delivery support across industrial regions.",
  },
  {
    number: "03",
    title: "Responsive support",
    body: "Practical guidance for selection, commissioning and after-sales requirements.",
  },
  {
    number: "04",
    title: "Experienced team",
    body: "Hands-on hydraulic knowledge backed by manufacturing and field experience.",
  },
  {
    number: "05",
    title: "In-house solutions",
    body: "Standard products and custom-built assemblies from one dependable partner.",
  },
];

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
  clientLogos: defaultClients,
  testimonials: defaultTestimonials,
  strengths: defaultStrengths,
  stats: defaultStats,
  usps: defaultUsps,
  customBandTitle: "Custom Hydraulic Solutions for Every Industry",
  customBandEyebrow: "Made around your application",
  customBandBody:
    "From standard power packs to fully customized systems, our team designs and manufactures equipment that meets your exact requirements.",
  customBandButtonText: "Get a custom solution",
  customBandButtonHref: "/contact/",
};
