// Core config & connections
export { initMultiTenantConfig, getConfig } from "./core/config";
export { connectToTenantsDb, getTenantsConnection, getTenantDbConnection, getTenantUri } from "./core/core";

// for apps that want to resolve tenant based on host
export { resolveTenant } from "./utils/resolveTenant";

// Express middleware support
export { tenantMiddleware } from "./middleware/middleware";
export { setDomainConfig, getDomainConfig } from "./middleware/domainConfig";

// Types
export * from "./types";
