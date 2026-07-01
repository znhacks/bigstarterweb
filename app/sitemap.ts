// app/sitemap.ts
import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Jika Anda memiliki data dinamis (misal dari database), ambil data tersebut di sini.

  const routes = ["", "/about", "/contact"].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date().toISOString().split("T")[0]
  }));

  return [...routes];
}
