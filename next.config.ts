import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const toProtocol = (value: string): "http" | "https" =>
  value === "http:" ? "http" : "https";

const supabaseRemotePattern = supabaseUrl
  ? (() => {
      const parsed = new URL(supabaseUrl);
      return {
        hostname: parsed.hostname,
        pathname: "/**",
        port: parsed.port || undefined,
        protocol: toProtocol(parsed.protocol),
      };
    })()
  : null;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
  images: {
    remotePatterns: supabaseRemotePattern ? [supabaseRemotePattern] : [],
  },
  reactCompiler: true,
};

export default nextConfig;
