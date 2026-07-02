// config/site.ts
export const siteConfig = {
  name: "BigStarter",
  description: "Website Sass dengan fitur yang super lengkap.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/logo.png",
  links: {
    twitter: "https://twitter.com/username",
    github: "https://github.com/username"
  }
};

export type SiteConfig = typeof siteConfig;
