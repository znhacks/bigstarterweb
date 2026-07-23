import { o, getTenantId } from "../context";
import { supabaseAdmin } from "../supabase-server";
import { transactionRepository } from "@/supabase/repositories/transactions";
import { transactionSchema, pagination, paginated } from "../schemas";
import { dbError } from "../errors";

export const listTransactions = o
  .route({
    method: "GET",
    path: "/transactions",
    tags: ["Billing"],
    summary: "List transactions",
    description: "Billing history for the current organization, newest first."
  })
  .input(pagination)
  .output(paginated(transactionSchema))
  .handler(async ({ input, context }) => {
    const tenantId = getTenantId(context);
    const transactionRepo = await transactionRepository(supabaseAdmin);
    const { data, count, error } = await transactionRepo
      .query()
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);
    if (error) throw dbError(error);
    return {
      data: data ?? [],
      total: count ?? 0,
      hasMore: input.offset + input.limit < (count ?? 0)
    };
  });

export const transactionsRouter = { list: listTransactions };
