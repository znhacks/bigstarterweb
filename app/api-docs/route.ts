import { ApiReference } from "@scalar/nextjs-api-reference";

/**
 * Standalone, full-page Scalar API reference.
 *
 * `@scalar/nextjs-api-reference` returns a complete HTML page (its own <html>,
 * navigation, search & theming), so this is a route handler — not a page that
 * sits inside the app layout. Open it at `/api-docs`.
 *
 * The spec is generated automatically from the oRPC contract at `/api/openapi.json`.
 */
export const GET = ApiReference({
  spec: { url: "/api/openapi.json" }
});
