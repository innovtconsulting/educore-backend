import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
  private static storage = new AsyncLocalStorage<number>();

  static setTenantId(tenantId: number) {
    this.storage.enterWith(tenantId);
  }

  static getTenantId(): number | undefined {
    return this.storage.getStore();
  }

  static run<T>(tenantId: number, callback: () => T): T {
    return this.storage.run(tenantId, callback);
  }
}
