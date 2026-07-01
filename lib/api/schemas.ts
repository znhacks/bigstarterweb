import * as z from "zod";

/** UUID string used for all primary keys in this schema. */
export const uuid = z.string().uuid();

/** Shared pagination input (query params). */
export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

/** Standard paginated list envelope. */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ data: z.array(item), total: z.number().int(), hasMore: z.boolean() });

export const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  price: z.number().int().nullable(),
  max_users: z.number().int().nullable(),
  type: z.string().nullable(),
  description: z.array(z.string())
});

export const taskSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string().nullable(),
  user_id: z.string().uuid().nullable(),
  created_at: z.string().nullable()
});

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  logo: z.string().nullable(),
  created_at: z.string().nullable()
});

export const memberSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role: z.string(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  avatar: z.string().nullable()
});

export const subscriptionSchema = z.object({
  tenant_id: z.string().uuid(),
  status: z.string().nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  cancel_at_period_end: z.boolean().nullable(),
  plan: z
    .object({
      name: z.string().nullable(),
      price: z.number().int().nullable(),
      max_users: z.number().int().nullable(),
      type: z.string().nullable()
    })
    .nullable()
});

export const transactionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  amount: z.number().int(),
  plan_name: z.string(),
  order_id: z.string(),
  status: z.string(),
  created_at: z.string().nullable()
});

export const apiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key_prefix: z.string(),
  last_used_at: z.string().nullable(),
  created_at: z.string().nullable(),
  revoked_at: z.string().nullable()
});
