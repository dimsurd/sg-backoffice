import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Lets the e2e suite build into its own folder (it bakes in a different API_URL)
  // without overwriting the normal .next build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The browser only ever talks to this origin; /api/* is proxied to the
  // Express API so the httpOnly session cookie is first-party and no CORS
  // is involved.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
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
