import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.spdmanager_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.spdmanager_POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL (or spdmanager_DATABASE_URL from Vercel Neon) must be set.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
});
