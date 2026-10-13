
import type { NextConfig } from "next";

const remotePatterns: NonNullable<
  NextConfig["images"]
>["remotePatterns"] = [];

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

  serverExternalPackages: [
    "postgres",
    "bcryptjs",
  ],

  images: {
    remotePatterns,
  },

  // Prevent search engines from indexing the entire site
  async headers() {
    return [
      {
        source: "/:path*",
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
