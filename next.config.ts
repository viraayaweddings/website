import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "off"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none"
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
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin"
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; child-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  }
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The mirrored TWC listing bundle calls its API with trailing slashes
  // (e.g. /twc-api/v1/decor/vendors/filters/?...). Next's default trailing-slash
  // 308 redirect breaks those XHR/ky requests (they fail with status 0), which
  // blanks the decorators listing (filters fetch fails -> FilterAccordian crash).
  // Disabling the redirect lets the route handlers serve both forms directly.
  skipTrailingSlashRedirect: true,
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
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/_next/static/media/:path*",
          destination: "/twc-mirror/_next/static/media/:path*"
        }
      ]
    };
  },
  async redirects() {
    return [
      { source: "/twc-client-terms", destination: "/client-terms", permanent: true },
      { source: "/twc-vendor-terms", destination: "/vendor-terms", permanent: true },
      { source: "/twc-privacy-policy", destination: "/privacy-policy", permanent: true },
      { source: "/twc-refund-policy", destination: "/refund-policy", permanent: true }
    ];
  }
};

export default nextConfig;
