"use client";

import { ApiReferenceReact as ApiReference } from "@scalar/api-reference-react";

export default function ApiDocsClient() {
  return (
    <div className="h-(--content-full-height, 100vh)">
      <ApiReference configuration={{ spec: { url: "/api/openapi.json" } }} />
    </div>
  );
}
