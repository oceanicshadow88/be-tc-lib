import { Request, Response, NextFunction } from "express";
import { getTenantsConnection, getTenantDbConnection, connectToTenantsDb } from "../core/core";
import { getConfig } from "../core/config";
import { getDomain } from "../utils/getDomain";
import { resolveTenant } from "../utils/resolveTenant";

declare module "express" {
  interface Request {
    tenantsConnection?: any;
    userConnection?: any;
    tenantId?: string;
    ownerId?: string;
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = getConfig();
    const domain = getDomain(req, config.isLocalEnv);

    const tenantsConn = await connectToTenantsDb();
    const tenant = await resolveTenant(domain, tenantsConn, config.isLocalEnv);

    const tenantId = tenant.id.toString();
    const userConn = await getTenantDbConnection(tenantId);

    req.tenantsConnection = tenantsConn;
    req.userConnection = userConn;
    req.tenantId = tenantId;
    req.ownerId = tenant.owner?.toString?.();

    return next();
  } catch (e: any) {
    const config = getConfig();

    if (e.message?.includes("Cannot read properties of null")) {
      console.error(
        `\x1b[31mError: Cannot find tenant from domain in DB.\nPlease check 'host' in config or request headers.\n\x1b[31mRESTART SERVER AFTER FIXING \x1b[0m\n`
      );
    }

    console.error("[tenantMiddleware] Error:", e);
    return res.status(500).json({ error: "Tenant resolution failed" });
  }
};
