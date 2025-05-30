import { initMultiTenantConfig, getTenantDbConnection, connectToTenantsDb } from "../src";
import mongoose, { Types } from "mongoose";
import { getModel } from "../src/models/tenants";

async function runTest() {
  await initMultiTenantConfig({
    tenantsUri: "mongodb://localhost:27017/tenants",
    publicUri: "mongodb://localhost:27017/techscrumapp",
    tenantId: "demoTenant123",
    host: "localhost",
    isLocalEnv: true,
  });

  // Initialize the connection to the tenants database
  const tenantsConn = await connectToTenantsDb();
  const TenantModel = getModel(tenantsConn);
  const exists = await TenantModel.findOne({ origin: "localhost" });
  if (!exists) {
    await TenantModel.create({
      origin: "localhost",
      plan: "Free",
      owner: new Types.ObjectId(),
      email: "test@example.com",
      active: true,
      passwordSecret: "test-secret",
      tenantTrialHistory: [],
    });
    console.log("[Test] Inserted test tenant");
  }

  // Get the tenant ID
  const tenant = await TenantModel.findOne({ origin: "localhost" });
  const tenantId = tenant?._id?.toString();

  if (!tenantId) throw new Error("Tenant not found");

  const conn = await getTenantDbConnection(tenantId);
  if (!(conn instanceof mongoose.Connection)) {
    throw new Error("[Test] ❌ Not a valid Mongoose Connection instance");
  }

  // Check if the connection is open
  if (conn.readyState !== 1) {
    throw new Error("[Test] ❌ Connection is not open");
  }
  console.log("[Test] Connection is open");

  // Create a test model in the tenant database
  const TestModel = conn.model("Test", new mongoose.Schema({ name: String }));
  await TestModel.create({ name: "Test_User" });

  // Check if the document was created
  const results = await TestModel.find();
  console.log("[Test] Docs:", results);

  // Clean up test data before closing
  await TestModel.deleteMany({});
  console.log("[Test] Cleared test documents");

  // Close the connections
  await conn.close();
  // delete (databaseConnectionPool as any)[tenantId];
  await tenantsConn.close();
  console.log("[Test] Connections closed");
}

runTest()
  .then(() => {
    console.log("[Test] ✅ Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Test] ❌ Error occurred:", err);
    process.exit(1);
  });
