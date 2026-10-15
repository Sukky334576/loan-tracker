import { prisma } from "@/lib/prisma";

/**
 * Runs safe, idempotent migrations on SQLite to ensure all Phase 3 columns
 * and tables exist without destroying existing data in /tmp/prod.db or dev.db.
 * @returns boolean indicating whether changes were made and need to be saved to blob.
 */
export async function ensureSafeMigrations(): Promise<boolean> {
  let needsUpload = false;

  try {
    // 1. Safe column additions on Borrower
    const borrowerCols = (await prisma
      .$queryRawUnsafe(`PRAGMA table_info("Borrower")`)
      .catch(() => [])) as any[];
    const borrowerColNames = borrowerCols.map((c) => c.name);

    if (borrowerColNames.length > 0) {
      if (!borrowerColNames.includes("nickname")) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Borrower" ADD COLUMN "nickname" TEXT;`);
        needsUpload = true;
        console.log("Migration: Added nickname to Borrower");
      }

      if (!borrowerColNames.includes("idCardPhoto")) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Borrower" ADD COLUMN "idCardPhoto" TEXT;`);
        needsUpload = true;
        console.log("Migration: Added idCardPhoto to Borrower");
      }
    }

    // 2. Safe column additions on Payment
    const paymentCols = (await prisma
      .$queryRawUnsafe(`PRAGMA table_info("Payment")`)
      .catch(() => [])) as any[];
    const paymentColNames = paymentCols.map((c) => c.name);

    if (paymentCols.length > 0) {
      if (!paymentColNames.includes("collectedBy")) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN "collectedBy" TEXT;`);
        needsUpload = true;
        console.log("Migration: Added collectedBy to Payment");
      }
    }

    // 3. Ensure AuditLog table exists
    await prisma
      .$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AuditLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "targetId" TEXT NOT NULL,
          "details" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      .catch(() => {});

    // 4. Ensure Document table exists
    await prisma
      .$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Document" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "borrowerId" TEXT NOT NULL,
          "fileUrl" TEXT NOT NULL,
          "docType" TEXT NOT NULL,
          "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("borrowerId") REFERENCES "Borrower" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)
      .catch(() => {});
  } catch (error) {
    console.error("ensureSafeMigrations error:", error);
  }

  return needsUpload;
}
