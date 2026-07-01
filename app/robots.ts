// app/robots.ts
import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/private/" // sesuaikan dengan rute yang ingin disembunyikan
    },
    sitemap: `${siteConfig.url}/sitemap.xml`
  };
}
