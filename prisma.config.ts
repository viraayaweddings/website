import { defineConfig } from "prisma/config";

const prismaGenerateUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/viraayaweddings?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: prismaGenerateUrl
  }
});
