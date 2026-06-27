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

  // Keep Neon usage minimal: cap the per-instance pool small and let it drop
  // idle connections quickly + fully (allowExitOnIdle) so Neon's compute can
  // scale to zero when there's no traffic instead of being held awake.
  const poolTuning = {
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true
  };

  if (!usesSsl) {
    return { connectionString: parsed.toString(), ...poolTuning };
  }

  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
    ...poolTuning
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
