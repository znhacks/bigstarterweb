import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { apiRouter } from "@/lib/api/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()]
});

export async function GET() {
  const spec = await generator.generate(apiRouter, {
    info: {
      title: "Websaas Public API",
      version: "1.0.0",
      description:
        "REST API for integrating with the platform. Most endpoints require an API key " +
        "(`Authorization: Bearer sk_live_...`). The `/plans` endpoints are public. " +
        "API keys are created from the dashboard API Keys page."
    },
    servers: [{ url: "/api/v1", description: "Current host" }]
  });

  spec.components ??= {};
  spec.components.securitySchemes = {
    apiKey: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "sk_live_...",
      description: "API key issued from the dashboard. Send as: `Authorization: Bearer sk_live_...`"
    }
  };
  spec.security = [{ apiKey: [] }];

  return Response.json(spec);
}
