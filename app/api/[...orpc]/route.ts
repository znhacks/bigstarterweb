import { Hono } from "hono";
import { cors } from "hono/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { apiRouter } from "@/lib/api/router";
import { resolveAuth } from "@/lib/api/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rpcHandler = new RPCHandler(apiRouter, {
  interceptors: [onError((error) => console.error("[api:rpc]", error))]
});

const openApiHandler = new OpenAPIHandler(apiRouter, {
  interceptors: [onError((error) => console.error("[api:v1]", error))]
});

const app = new Hono();

app.use("*", cors());

app.use("/api/rpc/*", async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context: { auth: await resolveAuth(c.req.raw) }
  });
  if (matched) return c.newResponse(response.body, response);
  await next();
});

app.use("/api/v1/*", async (c, next) => {
  const { matched, response } = await openApiHandler.handle(c.req.raw, {
    prefix: "/api/v1",
    context: { auth: await resolveAuth(c.req.raw) }
  });
  if (matched) return c.newResponse(response.body, response);
  await next();
});

app.all("*", (c) => c.text("Not Found", 404));

const handler = (req: Request) => app.fetch(req);

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS
};
