import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be configured in production.");
  }

  return "postgresql://postgres@localhost:55432/viraayaweddings?schema=public";
}

function getPrismaPgConfig() {
  const parsed = new URL(getDatabaseUrl());
  const sslMode = parsed.searchParams.get("sslmode");
  const usesSsl = sslMode && sslMode.toLowerCase() !== "disable";

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  if (!usesSsl) {
    return { connectionString: parsed.toString() };
  }

  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
  };
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(getPrismaPgConfig())
    });
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: keyof PrismaClient) {
    const client = getPrismaClient();
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  }
});
