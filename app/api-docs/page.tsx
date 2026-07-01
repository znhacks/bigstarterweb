import { generateMeta } from "@/lib/utils";
import ApiDocsClient from "./client";

export async function generateMetadata() {
  return generateMeta({
    title: "API Documentation",
    description: "Interactive OpenAPI documentation for the Websaas public API.",
    canonical: "/api-docs"
  });
}

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
