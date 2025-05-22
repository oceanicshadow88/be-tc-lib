import { Request } from "express";
import { getDomainConfig } from "../middleware/domainConfig";

export const getDomain = (req: Request, isLocalEnv: boolean): string => {
  const domainConfig = getDomainConfig();
  const hasConnectedTenant = domainConfig.connectTenantOrigin && domainConfig.connectTenantOrigin !== "";

  if (isLocalEnv) {
    if (hasConnectedTenant) {
      return `${domainConfig.protocol}${domainConfig.connectTenantOrigin}.${domainConfig.mainDomain}`;
    }
    if (req.headers.origin) {
      return req.headers.origin;
    }
    if (domainConfig.postmanTesting!.toLocaleLowerCase() === "true") {
      return "localhost";
    }
    return "";
  }

  return hasConnectedTenant
    ? `${domainConfig.protocol}${domainConfig.connectTenantOrigin}.${domainConfig.mainDomain}`
    : (req.headers.origin as string);
};
