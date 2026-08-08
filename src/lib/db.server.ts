import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Single reused Prisma client.
 *
 * The connection string is read lazily from process.env inside this factory so
 * it works on serverless runtimes where env is injected per request. It is
 * NEVER hard-coded and never reaches the client bundle (this file is
 * server-only by the *.server.ts convention).
 */
const globalForPrisma = globalThis as unknown as { __tshPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.__tshPrisma) return globalForPrisma.__tshPrisma;

  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  const adapter = new PrismaNeon({ connectionString });
  const client = new PrismaClient({ adapter });
  globalForPrisma.__tshPrisma = client;
  return client;
}
