import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const sqlConnectionString = process.env.DATABASE_URL || process.env.SQL_CONNECTION_STRING || "postgres://mock:mock@localhost:5432/mock_db";

// 🚀 SMART SSL DETECTOR: Disable SSL if connecting to a local database
const isLocalDB = sqlConnectionString.includes('localhost') || sqlConnectionString.includes('127.0.0.1');

const sqlSsl = process.env.SQL_SSL === 'true';
const sqlSslRejectUnauthorized = process.env.SQL_SSL_REJECT_UNAUTHORIZED === 'true';

const pool = new pg.Pool(
  process.env.DATABASE_URL || process.env.SQL_CONNECTION_STRING
    ? {
        connectionString: sqlConnectionString,
        // Only use SSL if it's enabled in .env AND we are not hitting localhost
        ssl: (sqlSsl && !isLocalDB) ? { rejectUnauthorized: sqlSslRejectUnauthorized } : undefined,
        connectionTimeoutMillis: 8000,
      }
    : {
        host: process.env.SQL_HOST || 'localhost',
        port: Number(process.env.SQL_PORT) || 5432,
        user: process.env.SQL_USER || 'mock',
        password: process.env.SQL_PASSWORD || 'mock',
        database: process.env.SQL_DB_NAME || 'mock',
        ssl: (sqlSsl && !isLocalDB) ? { rejectUnauthorized: sqlSslRejectUnauthorized } : undefined,
        connectionTimeoutMillis: 8000,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });