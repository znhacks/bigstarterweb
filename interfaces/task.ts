export interface ITaskRepository {
  create(title: string, subdomain: string): Promise<any>;
  list(subdomain: string): Promise<any[]>;
}
