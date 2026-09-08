import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "slhjiyxfjplbyhmrqgyy.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
