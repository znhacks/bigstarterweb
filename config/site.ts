const rawUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const formattedUrl =
  rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;

export const siteConfig = {
  name: "JM-Panel",
  description: "Platform Pengelolaan & Monitoring Jurnal Mengajar Sekolah.",
  url: formattedUrl,
  ogImage: "/logo.png",
  logo: "/logo.png",
  links: {
    twitter: "https://twitter.com/username",
    github: "https://github.com/username"
  }
};

export type SiteConfig = typeof siteConfig;
