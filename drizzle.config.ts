import { defineConfig } from 'drizzle-kit';
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;
const sqlConnectionString = process.env.DATABASE_URL || process.env.SQL_CONNECTION_STRING;
const sqlPortRaw = process.env.SQL_PORT;
const sqlPort = sqlPortRaw ? Number(sqlPortRaw) : undefined;
const sqlSsl = process.env.SQL_SSL === "true";
const sqlSslRejectUnauthorized = process.env.SQL_SSL_REJECT_UNAUTHORIZED === "true";

if (!sqlConnectionString && !sqlHost) {
  throw new Error("SQL_HOST must be set in environment variables.");
}
if (!sqlConnectionString && !sqlDbName) {
  throw new Error("SQL_DB_NAME must be set in environment variables.");
}
if (!sqlConnectionString && !user) {
  throw new Error("SQL_ADMIN_USER must be set in environment variables.");
}
if (!sqlConnectionString && !password) {
  throw new Error("SQL_ADMIN_PASSWORD must be set in environment variables.");
}
if (sqlPortRaw && (!Number.isInteger(sqlPort) || sqlPort <= 0)) {
  throw new Error("SQL_PORT must be a positive integer.");
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: sqlConnectionString
    ? {
        url: sqlConnectionString,
        ssl: sqlSsl ? { rejectUnauthorized: sqlSslRejectUnauthorized } : false,
      }
    : {
        host: sqlHost,
        port: sqlPort,
        user: user,
        password: password,
        database: sqlDbName,
        ssl: sqlSsl ? { rejectUnauthorized: sqlSslRejectUnauthorized } : false,
      },
});
