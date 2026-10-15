import { prisma } from "@/lib/prisma";

export type AuditActionType =
  | "LOGIN"
  | "BORROWER_CREATE"
  | "BORROWER_UPDATE"
  | "BORROWER_DELETE"
  | "LOAN_CREATE"
  | "LOAN_DELETE"
  | "LOAN_BAD_DEBT"
  | "PAYMENT_COLLECT"
  | "LEDGER_ADJUST"
  | "DB_RESET";

/**
 * Logs an important system event into the AuditLog table.
 * @param actor username or userId
 * @param actionType category of event
 * @param targetId related entity id (borrowerId, loanId, etc.)
 * @param details detail object or JSON string
 */
export async function logAudit(
  actor: string,
  actionType: AuditActionType | string,
  targetId: string,
  details: Record<string, any> | string
): Promise<void> {
  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ id: actor }, { username: actor }],
      },
    });

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) return;

    const detailsStr =
      typeof details === "string" ? details : JSON.stringify(details);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: actionType,
        targetId: targetId || "SYSTEM",
        details: detailsStr,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
