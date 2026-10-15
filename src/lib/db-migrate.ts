import { prisma } from "@/lib/prisma";

let migrationsApplied = false;

/**
 * Runs safe, idempotent migrations on SQLite to ensure all Phase 3 columns
 * and tables exist without destroying existing data in /tmp/prod.db or dev.db.
 */
export async function ensureSafeMigrations(): Promise<void> {
  if (migrationsApplied) return;

  try {
    // 1. Safe column additions on Borrower
    await prisma.$executeRawUnsafe(`ALTER TABLE "Borrower" ADD COLUMN "nickname" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Borrower" ADD COLUMN "idCardPhoto" TEXT;`).catch(() => {});

    // 2. Safe column additions on Payment
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN "collectedBy" TEXT;`).catch(() => {});

    // 3. Ensure AuditLog table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "details" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `).catch(() => {});

    // 4. Ensure Document table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Document" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "borrowerId" TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "docType" TEXT NOT NULL,
        "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("borrowerId") REFERENCES "Borrower" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `).catch(() => {});

    migrationsApplied = true;
  } catch (error) {
    console.error("ensureSafeMigrations error:", error);
  }
}
