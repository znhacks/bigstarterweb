// lib/metadata.ts
import { Metadata } from "next";
import { siteConfig } from "@/config/site";

interface MetadataProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

export function constructMetadata({
  title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  noIndex = false
}: MetadataProps = {}): Metadata {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: pageTitle,
      description,
      images: [
        {
          url: image
        }
      ],
      url: siteConfig.url,
      siteName: siteConfig.name
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [image],
      creator: "@username_twitter"
    },
    metadataBase: (() => {
      try {
        const u = siteConfig.url.startsWith("http") ? siteConfig.url : `https://${siteConfig.url}`;
        return new URL(u);
      } catch {
        return new URL("http://localhost:3000");
      }
    })(),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false
      }
    })
  };
}
