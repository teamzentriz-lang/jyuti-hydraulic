/** Site map mirrored from jyotihydraulic.com — used by the structure seed and home showcase. */

export type SkeletonProduct = {
  title: string;
  slug: string;
  summary: string;
};

export type SkeletonCategory = {
  title: string;
  slug: string;
  path: string;
  summary: string;
  children?: SkeletonCategory[];
  products?: SkeletonProduct[];
};

export const skeletonPages = [
  { title: "About us", slug: "about-us", path: "about-us" },
  { title: "Contact", slug: "contact", path: "contact" },
  { title: "Catalogue", slug: "catalogue", path: "catalogue" },
  { title: "Return policy", slug: "return-policy", path: "return-policy" },
  { title: "Thank you", slug: "thank-you", path: "thank-you" },
] as const;

export const skeletonPosts = [
  {
    title: "Industrial Baling Solutions Price in India: 2026 Buyer’s Guide",
    slug: "industrial-baling-solutions-price-india-2026",
    excerpt: "Placeholder post summarizing baling machine pricing and selection factors.",
  },
  {
    title: "Understanding the Working Principle of a Worm Gear Screw Jack",
    slug: "working-principle-worm-gear-screw-jack",
    excerpt: "Dummy article explaining screw jack mechanics for layout preview.",
  },
  {
    title: "Industrial Worm Gear Screw Jack Manufacturers in India",
    slug: "industrial-worm-gear-screw-jack-manufacturers-india",
    excerpt: "Sample blog intro for the listing and home sections.",
  },
] as const;

/** Top-level product groups shown on the home page (order matters). */
export const homeShowcasePaths = [
  "hydraulic-power-pack",
  "hydraulic-cylinder-manufacturers",
  "worm-gear-screw-jack",
] as const;

export const skeletonCatalogue: SkeletonCategory[] = [
  {
    title: "Hydraulic Cylinder Manufacturers",
    slug: "hydraulic-cylinder-manufacturers",
    path: "hydraulic-cylinder-manufacturers",
    summary: "Double acting, single acting, welded, and specialty cylinders.",
    children: [
      {
        title: "Double Acting Hydraulic Cylinders",
        slug: "double-acting-hydraulic-cylinders",
        path: "double-acting-hydraulic-cylinders",
        summary: "Dummy category for layout.",
        products: [
          { title: "Double Acting Hydraulic Cylinders", slug: "double-acting-hydraulic-cylinders", summary: "Sample product card copy." },
        ],
      },
      {
        title: "Telescopic Cylinders",
        slug: "telescopic-cylinders",
        path: "telescopic-cylinders",
        summary: "Multi-stage cylinders for long stroke applications.",
        products: [
          { title: "Telescopic Cylinders", slug: "telescopic-cylinders", summary: "Placeholder telescopic cylinder listing." },
        ],
      },
    ],
  },
  {
    title: "Hydraulic Power Pack",
    slug: "hydraulic-power-pack",
    path: "hydraulic-power-pack",
    summary: "DC and industrial power packs for mobile and plant equipment.",
    children: [
      {
        title: "12V DC Hydraulic Power Pack",
        slug: "12v-dc-hydraulic-power-pack",
        path: "12v-dc-hydraulic-power-pack",
        summary: "Compact 12V units.",
        products: [
          { title: "12V DC Hydraulic Power Pack", slug: "12v-dc-hydraulic-power-pack", summary: "Dummy 12V power pack page." },
        ],
      },
      {
        title: "Mini Hydraulic Power Pack",
        slug: "mini-hydraulic-power-pack",
        path: "mini-hydraulic-power-pack",
        summary: "Space-saving packs.",
        products: [
          { title: "Mini Hydraulic Power Pack", slug: "mini-hydraulic-power-pack", summary: "Placeholder mini pack details." },
        ],
      },
      {
        title: "Industrial Hydraulic Power Pack",
        slug: "industrial-hydraulic-power-pack",
        path: "industrial-hydraulic-power-pack",
        summary: "Heavy-duty industrial packs.",
        products: [
          { title: "Industrial Hydraulic Power Pack", slug: "industrial-hydraulic-power-pack", summary: "Sample industrial pack copy." },
        ],
      },
    ],
  },
  {
    title: "Worm Gear Screw Jack",
    slug: "worm-gear-screw-jack",
    path: "worm-gear-screw-jack",
    summary: "Metric and inch series screw jacks and actuators.",
    children: [
      {
        title: "Electric Actuators",
        slug: "electric-actuators",
        path: "electric-actuators",
        summary: "Motorized linear actuation.",
        products: [
          { title: "Electric Actuators", slug: "electric-actuators", summary: "Dummy actuator product page." },
        ],
      },
      {
        title: "Ball Screw Jacks",
        slug: "ball-screw-jacks",
        path: "ball-screw-jacks",
        summary: "High-efficiency ball screw jacks.",
        products: [
          { title: "Ball Screw Jacks", slug: "ball-screw-jacks", summary: "Placeholder ball screw jack copy." },
        ],
      },
    ],
  },
  {
    title: "Baling Machine Manufacturers in India",
    slug: "baling-machine-manufacturers-in-india",
    path: "baling-machine-manufacturers-in-india",
    summary: "Scrap, PET, and industrial baling presses.",
    products: [
      { title: "Scrap Baling Machine", slug: "scrap-baling-machine", summary: "Sample baling machine listing." },
    ],
  },
  {
    title: "Hydraulic Rotary Union",
    slug: "hydraulic-rotary-union",
    path: "hydraulic-rotary-union",
    summary: "Rotary joints for fluid transfer.",
    products: [
      { title: "Single Flow Rotary Unions", slug: "single-flow-rotary-unions", summary: "Dummy rotary union page." },
    ],
  },
  {
    title: "Leveling Jacks",
    slug: "leveling-jacks",
    path: "leveling-jacks",
    summary: "Industrial leveling and support jacks.",
    products: [
      { title: "Leveling Screw Jacks", slug: "leveling-screw-jacks", summary: "Placeholder leveling jack copy." },
    ],
  },
  {
    title: "Hydraulic Pump Manufacturers in India",
    slug: "hydraulic-pump-manufacturers-in-india",
    path: "hydraulic-pump-manufacturers-in-india",
    summary: "Gear, vane, and variable pumps.",
    products: [
      { title: "Hydraulic Gear Pump", slug: "hydraulic-gear-pump", summary: "Sample gear pump page." },
    ],
  },
];

export const skeletonHeaderNav = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about-us/" },
  {
    label: "Products",
    href: "/hydraulic-power-pack/",
    children: skeletonCatalogue.map((cat) => ({
      label: cat.title,
      href: `/${cat.path}/`,
    })),
  },
  { label: "Blogs", href: "/blogs/" },
  { label: "Gallery", href: "/gallery/" },
  { label: "Certificates", href: "/certificates/" },
  { label: "Catalogue", href: "/catalogue/" },
  { label: "Contact", href: "/contact/" },
] as const;

export const skeletonFooterNav = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us/" },
  { label: "Products", href: "/hydraulic-cylinder-manufacturers/" },
  { label: "Blogs", href: "/blogs/" },
  { label: "Contact Us", href: "/contact/" },
  { label: "Worm Gear Screw Jack Manufacturers in India", href: "/worm-gear-screw-jack/" },
  { label: "Baling Machine Manufacturers in India", href: "/baling-machine-manufacturers-in-india/" },
  { label: "Hydraulic Power Pack Manufacturer in India", href: "/hydraulic-power-pack/" },
] as const;
