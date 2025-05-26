import mongoose, { Connection } from "mongoose";
import { ITenantModel, getModel } from "../models/tenants";
import { Plans } from "../types";
import { PUBLIC_DB } from "../types";
import { getConfig } from "./config";

let tenantsConnection: Connection | null = null;
const databaseConnectionPool: Record<string, Connection> = {};

const connectionOptions = {
  maxPoolSize: 10,
  socketTimeoutMS: 30000,
};

// Create a connection to the tenants database
export const connectToTenantsDb = async (): Promise<Connection> => {
  const config = getConfig();

  if (!tenantsConnection) {
    tenantsConnection = await mongoose.createConnection(config.tenantsUri, connectionOptions);
  }
  return tenantsConnection;
};

// Get the connection to the tenants database
export const getTenantsConnection = (): Connection => {
  if (!tenantsConnection) {
    throw new Error("Tenants connection not initialized");
  }

  return tenantsConnection;
};

// Find a tenant by host and tenantId
export const getTenant = async (host: string, tenantId: string, isLocalEnv: boolean): Promise<ITenantModel> => {
  if (!host || !tenantId) {
    throw new Error("Missing host or tenantId");
  }

  const tenantModel = getModel(getTenantsConnection());

  const tenant = isLocalEnv
    ? await tenantModel.findOne({ origin: { $regex: host } })
    : await tenantModel.findOne({ origin: host });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
};

// Get the URI for a tenant database
export const getTenantUri = (tenant: ITenantModel): string => {
  const config = getConfig();
  const tenantUriName = tenant?.plan !== Plans.Free ? tenant.id.toString() : PUBLIC_DB;
  // to be fixed
  return config.publicUri.replace(PUBLIC_DB, tenantUriName);
};

// Get the connection to a tenant database
export const getTenantDbConnection = async (tenantId: string): Promise<Connection> => {
  const config = getConfig();
  if (!databaseConnectionPool || !databaseConnectionPool[tenantId]) {
    const tenant: ITenantModel = await getTenant(config.host, tenantId, config.isLocalEnv);
    const databaseUri = getTenantUri(tenant);
    const connection = await mongoose.createConnection(databaseUri, connectionOptions);
    await connection.asPromise();
    databaseConnectionPool[tenantId] = connection;
    return connection;
  }
  return databaseConnectionPool[tenantId];
};
