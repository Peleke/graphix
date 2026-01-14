import type { Config } from "drizzle-kit";

const isTurso = process.env.STORAGE_MODE === "turso";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "turso",
  dbCredentials: isTurso
    ? {
        url: process.env.TURSO_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: `file:${process.env.SQLITE_PATH || "./graphix.db"}`,
      },
} satisfies Config;
