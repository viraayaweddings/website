import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Route handlers read the captured HTML from data/ at runtime via fs; Vercel's
  // file tracer must bundle these into the serverless functions.
  outputFileTracingIncludes: {
    "/**": ["./data/**"]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/images/:path*",
          destination: "https://www.theweddingcompany.com/images/:path*"
        },
        {
          source: "/_next/static/media/:path*",
          destination:
            "https://www.theweddingcompany.com/_next/static/media/:path*"
        },
        {
          source: "/_next/data/:path*",
          destination: "https://www.theweddingcompany.com/_next/data/:path*"
        }
      ]
    };
  }
};

export default nextConfig;
