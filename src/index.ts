// Core config & connections
export { initMultiTenantConfig, getConfig } from "./tanent-db/config";
export {
  connectToTenantsDb,
  getTenantsConnection,
  getTenantDbConnection,
  getTenantUri,
} from "./tanent-db/dbConnection";

// for apps that want to resolve tenant based on host
export { resolveTenant } from "./utils/resolveTenant";

// Express middleware support
export { tenantMiddleware } from "./middleware/middleware";
export { setDomainConfig, getDomainConfig } from "./middleware/domainConfig";

// Types
export * from "./types";
