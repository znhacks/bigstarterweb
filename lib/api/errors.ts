import { ORPCError } from "@orpc/server";

export const unauthorized = (message = "Missing or invalid API key.") =>
  new ORPCError("UNAUTHORIZED", { message });

export const notFound = (message = "Resource not found.") =>
  new ORPCError("NOT_FOUND", { message });

export const badRequest = (message = "Invalid request.") =>
  new ORPCError("BAD_REQUEST", { message });

export const forbidden = (message = "You do not have access to this resource.") =>
  new ORPCError("FORBIDDEN", { message });

/**
 * Wrap a Supabase/Postgres error. Most driver errors are server faults; some
 * (e.g. unique violations, RLS) surface as the caller's mistake → BAD_REQUEST.
 */
export function dbError(error: { message: string; code?: string } | null | undefined) {
  const code = error?.code;
  const clientFault = code === "23505" || code === "23502" || code === "23514"; // unique_violation, not_null_violation, check_violation
  return new ORPCError(clientFault ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR", {
    message: error?.message ?? "Database error.",
    data: code ? { pgCode: code } : undefined
  });
}
