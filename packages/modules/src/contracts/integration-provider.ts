/**
 * IntegrationProvider. Én implementasjon per ekstern integrasjon
 * (Quick, Vegvesen/Autosys, Finn.no, Lime crm …). Toolkits i packages/tools.
 */
export interface IntegrationHealth {
  ok: boolean;
  checkedAt: string;
  detail?: string;
}

export interface IntegrationProvider<TConfig = unknown> {
  readonly id: string;
  /** Validerer tenant-config (f.eks. forhandlerens Quick API-nøkkel) med et ekte testkall. */
  validate(tenantId: string, config: TConfig): Promise<IntegrationHealth>;
  health(tenantId: string): Promise<IntegrationHealth>;
}
