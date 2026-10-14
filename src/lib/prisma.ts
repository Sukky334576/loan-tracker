import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// On Vercel serverless environment, ensure SQLite db file is copied to /tmp with read-write access
if (process.env.VERCEL) {
  const tmpPath = path.join("/tmp", "dev.db");
  const localDb = path.join(process.cwd(), "prisma", "dev.db");
  if (!fs.existsSync(tmpPath) && fs.existsSync(localDb)) {
    try {
      fs.copyFileSync(localDb, tmpPath);
    } catch (e) {
      console.error("Failed to copy dev.db to /tmp:", e);
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: process.env.VERCEL
      ? {
          db: {
            url: "file:/tmp/dev.db",
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
