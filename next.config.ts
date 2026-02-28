import type { NextConfig } from "next";

// Extract the hostname from R2_PUBLIC_URL so next/image can optimise those images.
// Falls back to a wildcard pattern if the env var isn't set yet.
function r2Hostname(): string {
  try {
    const url = process.env.R2_PUBLIC_URL;
    if (url) return new URL(url).hostname;
  } catch {}
  return "*.r2.dev";
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2Hostname(),
        pathname: "/menu_items/**",
      },
      // Keep Firebase Storage URLs working for any existing items
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
