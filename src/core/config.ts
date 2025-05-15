import type { MultiTenantConfig } from "../types";

let _internalConfig: Required<MultiTenantConfig>;

export const initMultiTenantConfig = (config: MultiTenantConfig) => {
  _internalConfig = {
    ...config,
    isLocalEnv: config.isLocalEnv ?? false,
  };

  if (!_internalConfig.tenantsUri || !_internalConfig.publicUri || !_internalConfig.tenantId) {
    throw new Error("Missing required configuration parameters");
  }
};

export const getConfig = (): Readonly<Required<MultiTenantConfig>> => {
  if (!_internalConfig) {
    throw new Error("Configuration not initialized");
  }
  return _internalConfig;
};
