import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL ?? [
  `postgresql://${encodeURIComponent(process.env.DB_USER ?? "postgres")}`,
  `:${encodeURIComponent(process.env.DB_PASSWORD ?? "")}`,
  `@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? "5432"}`,
  `/${process.env.DB_NAME ?? "financeapp"}?schema=public`,
].join("");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
