"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { syncDbFromBlob, saveDbToBlob } from "@/lib/blob-sync";
import { getSession } from "@/app/actions/auth";
import { logAudit } from "@/lib/audit";

export async function addCapitalAction(params: {
  amount: number;
  type?: "CAPITAL_INJECTION" | "WITHDRAWAL";
  description?: string;
  transactionDate?: string;
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return { success: false, error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการจัดการเงินกองกลาง" };
    }

    await syncDbFromBlob(true);
    const { amount, type = "CAPITAL_INJECTION", description, transactionDate } = params;

    if (!amount || amount <= 0) {
      return { success: false, error: "กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0 บาท)" };
    }

    let txDate = new Date();
    if (transactionDate) {
      const parsed = new Date(transactionDate.includes("T") ? transactionDate : `${transactionDate}T12:00:00`);
      if (!isNaN(parsed.getTime())) {
        txDate = parsed;
      }
    }

    const defaultDesc =
      type === "CAPITAL_INJECTION"
        ? "เติมเงินทุนเข้ากองกลาง"
        : "เบิกถอนเงินทุนออกจากกองกลาง";

    await prisma.cashLedger.create({
      data: {
        type,
        amount: Number(amount),
        description: description?.trim() || defaultDesc,
        createdAt: txDate,
      },
    });

    await logAudit(session?.id || "farafull", "LEDGER_ADJUST", "LEDGER", {
      action: type,
      amount: Number(amount),
      description: description?.trim() || defaultDesc,
      transactionDate: txDate.toISOString(),
      isBackdated: Boolean(transactionDate),
    });

    await saveDbToBlob();

    safeRevalidate("/");
    safeRevalidate("/ledger");

    return { success: true };
  } catch (error: any) {
    console.error("Add capital error:", error);
    return { success: false, error: error.message ?? "บันทึกข้อมูลเงินกองกลางไม่สำเร็จ" };
  }
}

export async function setFundBalanceAction(params: {
  targetAmount: number;
  description?: string;
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return { success: false, error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการปรับยอดกองกลาง" };
    }

    await syncDbFromBlob(true);

    const { targetAmount, description } = params;

    if (targetAmount === undefined || targetAmount === null || targetAmount < 0) {
      return { success: false, error: "กรุณาระบุจำนวนเงินกองกลางที่ถูกต้อง" };
    }

    // 1. Calculate current balance
    const ledgerEntries = await prisma.cashLedger.findMany();
    const currentBalance = ledgerEntries.reduce((sum, entry) => {
      if (entry.type === "CAPITAL_INJECTION" || entry.type === "REPAYMENT") {
        return sum + entry.amount;
      }
      return sum - entry.amount;
    }, 0);

    const difference = targetAmount - currentBalance;

    if (Math.abs(difference) < 0.01) {
      return { success: true, message: "ยอดเงินกองกลางตรงกับที่ระบุอยู่แล้ว" };
    }

    if (difference > 0) {
      await prisma.cashLedger.create({
        data: {
          type: "CAPITAL_INJECTION",
          amount: difference,
          description: description?.trim() || `ปรับปรุงยอดเงินกองกลางตั้งต้นเป็น ${targetAmount.toLocaleString()} ฿`,
        },
      });
    } else {
      await prisma.cashLedger.create({
        data: {
          type: "WITHDRAWAL",
          amount: Math.abs(difference),
          description: description?.trim() || `ปรับปรุงลดยอดเงินกองกลางเป็น ${targetAmount.toLocaleString()} ฿`,
        },
      });
    }

    await logAudit(session?.id || "farafull", "LEDGER_ADJUST", "LEDGER", {
      action: "SET_BALANCE",
      targetAmount,
      difference,
      description: description?.trim() || `ปรับปรุงยอดเงินกองกลางตั้งต้นเป็น ${targetAmount.toLocaleString()} ฿`,
    });

    await saveDbToBlob();

    safeRevalidate("/");
    safeRevalidate("/ledger");

    return { success: true };
  } catch (error: any) {
    console.error("Set fund balance error:", error);
    return { success: false, error: error.message ?? "ปรับปรุงยอดเงินกองกลางไม่สำเร็จ" };
  }
}

export async function resetDatabaseToProductionAction(params?: {
  initialCapital?: number;
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return { success: false, error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการล้างข้อมูลระบบ" };
    }

    await syncDbFromBlob(true);

    const initialCapital = params?.initialCapital ? Number(params.initialCapital) : 0;

    await prisma.$transaction(async (tx) => {
      // Clear all transaction data
      await tx.payment.deleteMany();
      await tx.collectionLog.deleteMany();
      await tx.document.deleteMany();
      await tx.loan.deleteMany();
      await tx.borrower.deleteMany();
      await tx.cashLedger.deleteMany();
      await tx.auditLog.deleteMany();

      // If initial capital specified, create initial entry
      if (initialCapital > 0) {
        await tx.cashLedger.create({
          data: {
            type: "CAPITAL_INJECTION",
            amount: initialCapital,
            description: `เงินทุนตั้งต้นกองกลาง (เริ่มต้นใช้งานจริง) ${initialCapital.toLocaleString()} ฿`,
          },
        });
      }
    });

    await logAudit(session?.id || "farafull", "DB_RESET", "SYSTEM", {
      initialCapital,
      resetBy: session?.username || "farafull",
    });

    await saveDbToBlob();

    safeRevalidate("/");
    safeRevalidate("/borrowers");
    safeRevalidate("/ledger");
    safeRevalidate("/loans/new");

    return { success: true };
  } catch (error: any) {
    console.error("Reset database error:", error);
    return { success: false, error: error.message ?? "ล้างข้อมูลระบบไม่สำเร็จ" };
  }
}
