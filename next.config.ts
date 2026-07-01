import type { NextConfig } from "next";
import { config } from "dotenv";
import createNextIntlPlugin from "next-intl/plugin";

config();

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  assetPrefix: isProduction ? "https://dashboard.shadcnuikit.com" : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost"
      },
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
