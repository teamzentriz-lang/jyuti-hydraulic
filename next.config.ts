import type { NextConfig } from "next";
import { indexingHost } from "./src/lib/indexing";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

const publicMedia = process.env.R2_PUBLIC_URL;

if (publicMedia) {
  try {
    const url = new URL(publicMedia);

    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
    });
  } catch {
    // Ignore an invalid public URL until storage is configured.
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  trailingSlash: true,
  devIndicators: false,

  experimental: {
    // Product records can contain long imported HTML plus tables and gallery
    // metadata. Keep valid CMS saves comfortably above the 1 MB default.
    serverActions: { bodySizeLimit: "5mb" },
  },

  serverExternalPackages: ["postgres", "bcryptjs", "web-push"],

  images: {
    remotePatterns,
  },

  async headers() {
    const host = indexingHost();
    return [
      {
        source: "/:path*",
        ...(host ? { missing: [{ type: "host" as const, value: host.replaceAll(".", "\\.") }] } : {}),
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
