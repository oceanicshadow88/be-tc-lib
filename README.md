# be-tc-lib

A lightweight, Express-compatible multi-tenant MongoDB connection manager for SaaS applications.

---

## Features

- **Multi-tenant MongoDB connection pool**
- Optional Express middleware support
- Simple config-based API (no framework lock-in)
- Reuses connections intelligently for performance

---

## Installation

```bash
npm add be-tc-lib
or
yarn add be-tc-lib
```

---

## Usage

### 1. Configure the library

```ts
import { initMultiTenantConfig } from "be-tc-lib";

initMultiTenantConfig({
  tenantsUri: "mongodb://localhost:27017/tenants",
  publicUri: "mongodb://localhost:27017/public",
  tenantId: "tenant123",
  host: "tenant123.example.com",
  isLocalEnv: true,
});
```

### 2. (Optional) Configure domain logic for middleware

```ts
import { setDomainConfig } from "be-tc-lib";

setDomainConfig({
  protocol: "https://",
  mainDomain: "example.com",
  connectTenantOrigin: "tenant123",
  postmanTesting: "false",
});
```

### 3. Use in Express

```ts
import express from "express";
import { tenantMiddleware } from "be-tc-lib";

const app = express();

app.use(tenantMiddleware);

app.get("/users", async (req, res) => {
  const User = req.userConnection.model("User");
  const users = await User.find();
  res.json(users);
});
```

---

## API Reference

### `initMultiTenantConfig(config: MultiTenantConfig)`

Set up base configuration.

### `getTenantDbConnection(tenantId: string)`

Returns a connected Mongoose instance for the given tenant.

### `tenantMiddleware`

An Express middleware that attaches:

- `req.userConnection`
- `req.tenantId`
- `req.tenantsConnection`

---

## Development

```bash
npm run build
npx tsc
npm test
```

---

## License

MIT
