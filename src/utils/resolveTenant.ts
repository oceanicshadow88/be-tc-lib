import { ITenantModel, getModel } from "../models/tenants";
import { Connection } from "mongoose";

export const resolveTenant = async (
  host: string,
  connection: Connection,
  isLocalEnv: boolean
): Promise<ITenantModel> => {
  if (!host) {
    throw new Error("No host provided");
  }
  const tenantModel = getModel(connection);

  const query = isLocalEnv ? { origin: { $regex: host } } : { origin: host };

  const tenant = await tenantModel.findOne(query);

  if (!tenant && !isLocalEnv) {
    throw new Error(`Cannot find tenant for host: ${host}`);
  }

  return tenant;
};
