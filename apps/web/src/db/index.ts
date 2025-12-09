import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL is missing. Using dummy connection string. Database operations will fail.");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
