import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Append connection pool params if not already present
  let url = process.env.DATABASE_URL || "";
  if (url && !url.includes("connection_limit")) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}connection_limit=5&pool_timeout=10&connect_timeout=10`;
  }
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Prisma.Decimal) return obj.toNumber() as T;
  if (Array.isArray(obj)) return obj.map(serializeDecimal) as T;
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDecimal(value);
    }
    return result as T;
  }
  return obj;
}
