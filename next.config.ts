import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turns every `href` into a checked literal, so a typo like `/dashbord`
  // becomes a type error instead of a 404 at runtime.
  typedRoutes: true,

  // Auto-memoizes components, so most `useMemo`/`useCallback` calls become
  // unnecessary. Next.js only runs the compiler on files that actually contain
  // JSX or hooks rather than the whole tree.
  reactCompiler: true,

  // Generates editor IntelliSense for the env vars actually present at build
  // time, which is what makes the helper in `lib/supabase/env.ts` redundant.
  experimental: {
    typedEnv: true,
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
