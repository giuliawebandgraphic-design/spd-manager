import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

/**
 * Vercel's Neon integration namespaces the variables it adds to a project.
 * Accept the standard names too, so local development can use a normal
 * DATABASE_URL without copying production credentials.
 */
function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.spdmanager_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.spdmanager_POSTGRES_URL
  );
}

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: pg.Pool | undefined;
}

// Function to create or retrieve the connection pool using the Object Method
export const createPool = (): pg.Pool => {
  if (!global._postgresPool) {
    const connectionString = getDatabaseUrl();
    if (!connectionString) {
      throw new Error(
        'Database connection is not configured. Set DATABASE_URL (or the Vercel Neon spdmanager_DATABASE_URL variable).'
      );
    }

    global._postgresPool = new Pool({
      connectionString,
      // Neon requires TLS. This also works with Neon URLs that include
      // sslmode=require and avoids relying on a local CA bundle in Vercel.
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 15000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create pool instance lazily
const pool = createPool();

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });

export { getDatabaseUrl, pool };
