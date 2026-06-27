import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; img-src 'self' https: data: blob:; font-src 'self' https: data:; media-src 'self' https: data: blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
  }
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Route handlers read the captured HTML from data/ at runtime via fs; Vercel's
  // file tracer must bundle these into the serverless functions.
  outputFileTracingIncludes: {
    "/**": ["./data/**"]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive"
          }
        ]
      },
      {
        source: "/twc-api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive"
          }
        ]
      }
    ];
  },
  async redirects() {
    return [
      { source: "/twc-client-terms", destination: "/client-terms", permanent: true },
      { source: "/twc-vendor-terms", destination: "/vendor-terms", permanent: true },
      { source: "/twc-privacy-policy", destination: "/privacy-policy", permanent: true },
      { source: "/twc-refund-policy", destination: "/refund-policy", permanent: true }
    ];
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
