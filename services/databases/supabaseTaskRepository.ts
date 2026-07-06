import { ITaskRepository } from "@/interfaces/task";
import { getTenantClient } from "@/lib/supabase/manager";

export class SupabaseTaskRepository implements ITaskRepository {
  async create(title: string, subdomain: string): Promise<any> {
    const { db, tenant } = await getTenantClient(subdomain);
    const payload: any = { title };

    if (tenant.db_model === "SHARED") payload.tenant_id = tenant.id;

    // Kueri otomatis mengarah ke tabel 'tasks' di skema yang benar
    const { data, error } = await db.from("tasks").insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async list(subdomain: string): Promise<any[]> {
    const { db, tenant } = await getTenantClient(subdomain);
    let query = db.from("tasks").select("*");

    if (tenant.db_model === "SHARED") query = query.eq("tenant_id", tenant.id);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}
