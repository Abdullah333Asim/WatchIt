import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const sqlConnectionString = process.env.DATABASE_URL || process.env.SQL_CONNECTION_STRING;
const sqlPortRaw = process.env.SQL_PORT;
const sqlPort = sqlPortRaw ? Number(sqlPortRaw) : undefined;
if (sqlPortRaw && (!Number.isInteger(sqlPort) || sqlPort <= 0)) {
  throw new Error("SQL_PORT must be a positive integer.");
}

const sqlSsl = process.env.SQL_SSL === 'true';
const sqlSslRejectUnauthorized = process.env.SQL_SSL_REJECT_UNAUTHORIZED === 'true';

const pool = new pg.Pool(
  sqlConnectionString
    ? {
        connectionString: sqlConnectionString,
        ssl: sqlSsl ? { rejectUnauthorized: sqlSslRejectUnauthorized } : undefined,
        connectionTimeoutMillis: 15000,
      }
    : {
        host: process.env.SQL_HOST,
        port: sqlPort,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        ssl: sqlSsl ? { rejectUnauthorized: sqlSslRejectUnauthorized } : undefined,
        connectionTimeoutMillis: 15000,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
