import { PrismaClient } from "@prisma/client";
import { IDatabaseService } from "@/interfaces/database";

const globalPrisma = new PrismaClient();
const connectionCache: Record<string, PrismaClient> = {};

export class PrismaDatabaseService implements IDatabaseService<PrismaClient> {
  async getClient(subdomain: string) {
    const tenant = (await globalPrisma.tenant.findFirst({
      where: { slug: subdomain }
    })) as any;

    if (!tenant) throw new Error("Tenant tidak terdaftar");

    if (tenant.dbModel === "SHARED") {
      return { client: globalPrisma, tenantId: tenant.id, dbModel: "SHARED" as const };
    }

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
