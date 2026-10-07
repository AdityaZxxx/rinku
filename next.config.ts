import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turns every `href` into a checked literal, so a typo like `/dashbord`
  // becomes a type error instead of a 404 at runtime.
  typedRoutes: true,

  // Auto-memoizes components, so most `useMemo`/`useCallback` calls become
  // unnecessary. Next.js only runs the compiler on files that actually contain
  // JSX or hooks rather than the whole tree.
  reactCompiler: true,

  // Module scripts always send an Origin header, and the dev server 403-blocks
  // requests whose Origin hostname is not localhost unless listed here. Without
  // this entry the app loads over the LAN but renders without hydration:
  // forms submit natively and sign-in silently does nothing.
  allowedDevOrigins: ["192.168.1.6"],

  // Generates editor IntelliSense for the env vars actually present at build
  // time.
  experimental: {
    typedEnv: true,
    serverActions: {
      // Server actions cap bodies at 1 MB by default; the buckets accept 2 MB
      // (avatars) and 5 MB (banners), so uploads need this headroom plus the
      // multipart overhead.
      bodySizeLimit: "6mb",
    },
  },

  images: {
    // Avatars and background images are served from Supabase Storage, which
    // rewrites the path to a signed CDN URL. Without this, next/image rejects
    // the host at runtime and the image silently falls back to a broken icon.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
