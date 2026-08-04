export const siteConfig = {
  name: "JM-Panel",
  description: "Platform Pengelolaan & Monitoring Jurnal Mengajar Sekolah.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/logo.png",
  logo: "/logo.png",
  links: {
    twitter: "https://twitter.com/username",
    github: "https://github.com/username"
  }
};

export type SiteConfig = typeof siteConfig;
