import { AsyncLocalStorage } from 'node:async_hooks';

type AuthReq = {
  headers: Headers;
  tenantId?: string | null;
};

const lager = new AsyncLocalStorage<AuthReq>();

export function kjorMedAuthRequest<T>(req: AuthReq, fn: () => T): T {
  return lager.run(req, fn);
}

export function lesAuthTenantId(): string | null {
  return lager.getStore()?.tenantId ?? null;
}

export function settAuthTenantId(tenantId: string | null): void {
  const s = lager.getStore();
  if (s) s.tenantId = tenantId;
}

export function lesAuthRequestHeaders(): Headers | null {
  return lager.getStore()?.headers ?? null;
}
