import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import loadEnv from "../utils/envLoader";

loadEnv();

const connectionString = process.env.DATABASE_URL ?? [
  `postgresql://${encodeURIComponent(process.env.DB_USER ?? "postgres")}`,
  `:${encodeURIComponent(process.env.DB_PASSWORD ?? "")}`,
  `@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? "5432"}`,
  `/${process.env.DB_NAME ?? "financeapp"}`,
].join("");

const adapter = new PrismaPg(connectionString);

export const prisma = new PrismaClient({ adapter });
