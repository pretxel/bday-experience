import type { NextConfig } from "next";

/**
 * Content files live outside `public/` and are read from disk at request time.
 * `outputFileTracingIncludes` makes sure the bundler copies them into the
 * serverless function bundle on Vercel (and any other tracing-based deploy).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  outputFileTracingIncludes: {
    "/**/*": ["./content/**/*"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /*
           * The Content-Security-Policy lives in `proxy.ts` because it needs
           * a per-request nonce. The headers below are static, so they can
           * live here.
           */
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            // The whole experience is private: no crawler should index it.
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
