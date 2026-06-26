import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    "postgresql://postgres@localhost:55432/viraayaweddings?schema=public"
  );
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaPg(getDatabaseUrl())
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
