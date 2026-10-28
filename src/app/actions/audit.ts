"use server";

import { logAudit, AuditActionType } from "@/lib/audit";
import { getSession } from "@/app/actions/auth";

/**
 * Server Action to allow client components to record audited events
 * (such as thermal receipt printing and CSV exports).
 */
export async function recordAuditLogAction(
  actionType: AuditActionType,
  targetId: string,
  details: Record<string, any> | string
) {
  try {
    const session = await getSession();
    const actor = session?.username || session?.id || "ANONYMOUS";

    await logAudit(actor, actionType, targetId, details);
    return { success: true };
  } catch (error: any) {
    console.error("recordAuditLogAction error:", error);
    return { success: false, error: error.message };
  }
}
