/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@core/supabase", "@core/config"],
  experimental: {
    serverComponentsExternalPackages: [],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zuasvnngkvdywbcebaqf.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
