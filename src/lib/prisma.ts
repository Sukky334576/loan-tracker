import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { DB_BASE64 } from "./db-base64";

// On Vercel / serverless environment, ensure SQLite db file is populated in /tmp with read-write access
function ensureVercelDb() {
  if (process.env.VERCEL) {
    const tmpPath = path.join("/tmp", "prod.db");
    process.env.DATABASE_URL = "file:/tmp/prod.db";
    try {
      if (!fs.existsSync(tmpPath) || fs.statSync(tmpPath).size < 10000) {
        const buffer = Buffer.from(DB_BASE64, "base64");
        fs.writeFileSync(tmpPath, buffer);
      }
    } catch (e) {
      console.error("Failed to initialize /tmp/prod.db:", e);
    }
  }
}

ensureVercelDb();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: process.env.VERCEL
      ? {
          db: {
            url: "file:/tmp/prod.db",
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
