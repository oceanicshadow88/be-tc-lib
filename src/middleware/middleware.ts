import { Request, Response, NextFunction } from "express";
import { getTenantDbConnection, connectToTenantsDb } from "../tanent-db/dbConnection";
import { getConfig } from "../tanent-db/config";
import { getDomain } from "../utils/getDomain";
import { resolveTenant } from "../utils/resolveTenant";
import { Connection } from "mongoose";

declare module "express" {
  interface Request {
    tenantsConnection?: Connection;
    userConnection?: Connection;
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
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");

    if (error.message.includes("Cannot read properties of null")) {
      const domain = getDomain(req, getConfig().isLocalEnv);
      console.error(
        `\x1b[31mError: Cannot find tenant from domain '${domain}' in DB.\n` +
          `Please check 'host' in config or request headers.\n` +
          `\x1b[31mRESTART SERVER AFTER FIXING\x1b[0m\n`
      );
      return res.status(400).json({
        error: "Tenant not found",
        message: `Domain '${domain}' is not associated with any tenant.`,
      });
    }

    console.error("[tenantMiddleware] Unknown error:", error);
    return res.status(500).json({ error: "Tenant resolution failed", message: error.message });
  }
};
