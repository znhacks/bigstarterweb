import { o } from "./context";
import { plansRouter } from "./routers/plans";
import { tasksRouter } from "./routers/tasks";
import { organizationsRouter } from "./routers/organizations";
import { membersRouter } from "./routers/members";
import { subscriptionsRouter } from "./routers/subscriptions";
import { transactionsRouter } from "./routers/transactions";
import { apiKeysRouter } from "./routers/api-keys";

/**
 * Single source of truth for the public API. The same router powers:
 *  - `/api/rpc/**` (oRPC RPC, type-safe TS clients)
 *  - `/api/v1/**`  (REST/OpenAPI, external consumption)
 *
 * Built on the shared `o` builder so every procedure shares the `ApiContext` type.
 */
export const apiRouter = o.router({
  plans: plansRouter,
  tasks: tasksRouter,
  organizations: organizationsRouter,
  members: membersRouter,
  subscriptions: subscriptionsRouter,
  transactions: transactionsRouter,
  apiKeys: apiKeysRouter
});
