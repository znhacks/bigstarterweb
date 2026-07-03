import { PrismaClient } from "@prisma/client";
import { IDatabaseService } from "@/interfaces/database";

const globalPrisma = new PrismaClient(); // DB Utama / System DB
const connectionCache: Record<string, PrismaClient> = {};

export class PrismaDatabaseService implements IDatabaseService<PrismaClient> {
  async getClient(subdomain: string) {
    // 1. Cari data tenant di Database Sistem Utama
    const tenant = await globalPrisma.tenant.findUnique({
      where: { subdomain }
    });

    if (!tenant) throw new Error("Tenant tidak terdaftar");

    if (tenant.db_model === "SHARED") {
      return { client: globalPrisma, tenantId: tenant.id, dbModel: "SHARED" as const };
    }

    // MODEL 2: Koneksi dinamis ke DB terisolasi milik tenant (MySQL/PostgreSQL lain)
    if (!connectionCache[tenant.id]) {
      connectionCache[tenant.id] = new PrismaClient({
        datasources: {
          db: { url: tenant.db_connection_string! }
        }
      });
    }

    return {
      client: connectionCache[tenant.id],
      tenantId: tenant.id,
      dbModel: "ISOLATED" as const
    };
  }
}
