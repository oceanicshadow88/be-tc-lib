export interface MultiTenantConfig {
  tenantsUri: string;
  publicUri: string;
  tenantId: string;
  host: string;
  isLocalEnv?: boolean;
}

export const PUBLIC_DB = "public";

export enum Plans {
  Free = "Free",
}
