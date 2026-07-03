export interface IDatabaseService<TClient = any> {
  getClient(subdomain: string): Promise<{
    client: TClient;
    tenantId: string;
    dbModel: "SHARED" | "ISOLATED";
  }>;
}
