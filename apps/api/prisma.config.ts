import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI commands that access the database require DATABASE_URL.
    // The fallback keeps `prisma generate` usable in a clean checkout.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/financeapp",
  },
});
