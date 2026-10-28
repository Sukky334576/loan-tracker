"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { syncDbFromBlob, saveDbToBlob } from "@/lib/blob-sync";

import { getSession } from "@/app/actions/auth";

export interface RecordPaymentInput {
  loanId: string;
  payType: "INTEREST" | "PRINCIPAL_CUT" | "SETTLE";
  amountPaid: number;
  notes?: string;
  slipUrl?: string;
  paidAt?: string;
}

export async function recordPaymentAction(input: RecordPaymentInput) {
  try {
    await syncDbFromBlob(true);

    const session = await getSession();
    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนบันทึกการชำระเงิน" };
    }
    const actorUsername = session.username || "agent1";
    const actorUserId = session.id;

    const { loanId, payType, amountPaid, notes, slipUrl } = input;

    if (!loanId || amountPaid <= 0) {
      return { success: false, error: "ข้อมูลการชำระเงินไม่ถูกต้อง" };
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) {
      return { success: false, error: "ไม่พบข้อมูลสัญญากู้เงิน" };
    }

    if (loan.status === "SETTLED") {
      return { success: false, error: "สัญญานี้ถูกปิดยอดไปแล้ว" };
    }

    // 1. Waterfall Calculation
    const cycleInterest = loan.remainingPrincipal * loan.interestRate;
    let remainingAmount = amountPaid;

    // A. Deduct Penalty
    let penaltyPaid = 0;
    if (loan.penaltyAccrued > 0) {
      penaltyPaid = Math.min(loan.penaltyAccrued, remainingAmount);
      remainingAmount -= penaltyPaid;
    }

    // B. Deduct Accrued Interest (from past underpayments)
    let accruedInterestPaid = 0;
    if (loan.accruedInterest > 0) {
      accruedInterestPaid = Math.min(loan.accruedInterest, remainingAmount);
      remainingAmount -= accruedInterestPaid;
    }

    // C. Deduct Current Cycle Interest
    let currentInterestPaid = 0;
    let underpaidCarryover = 0;
    if (remainingAmount >= cycleInterest) {
      currentInterestPaid = cycleInterest;
      remainingAmount -= cycleInterest;
    } else {
      currentInterestPaid = remainingAmount;
      underpaidCarryover = cycleInterest - currentInterestPaid;
      remainingAmount = 0;
    }

    // D. Remaining Amount goes to Principal Cut
    const principalCut = Math.min(loan.remainingPrincipal, remainingAmount);
    const newRemainingPrincipal = loan.remainingPrincipal - principalCut;

    // Determine new status and next due date
    const isSettlement = payType === "SETTLE" || newRemainingPrincipal <= 0;
    const termDays = loan.termType === "DAYS_7" ? 7 : 10;

    // Backdated payment support
    let paymentDate = new Date();
    if (input.paidAt) {
      const parsed = new Date(input.paidAt.includes("T") ? input.paidAt : `${input.paidAt}T12:00:00`);
      if (!isNaN(parsed.getTime())) {
        paymentDate = parsed;
      }
    }

    const nextDueDate = new Date(paymentDate);
    nextDueDate.setDate(nextDueDate.getDate() + termDays);
    nextDueDate.setHours(18, 0, 0, 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isStillOverdue = !isSettlement && nextDueDate.getTime() < startOfToday.getTime();
    const newStatus = isSettlement
      ? "SETTLED"
      : underpaidCarryover > 0
      ? "PARTIALLY_PAID"
      : isStillOverdue
      ? "OVERDUE"
      : "ACTIVE";

    // 2. Execute Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Payment Record
      const payment = await tx.payment.create({
        data: {
          loanId: loan.id,
          paymentType: isSettlement
            ? "SETTLEMENT"
            : principalCut > 0
            ? "PRINCIPAL_CUT"
            : underpaidCarryover > 0
            ? "UNDERPAID"
            : "INTEREST_ONLY",
          amountPaid,
          penaltyPaid,
          accruedInterestPaid,
          currentInterestPaid,
          principalCut,
          underpaidCarryover,
          slipUrl: slipUrl ?? "/slip-placeholder.png",
          verificationStatus: "VERIFIED",
          paidAt: paymentDate,
          verifiedBy: actorUsername,
          collectedBy: actorUsername,
          notes: notes ?? (isSettlement ? "ปิดยอดสัญญาเรียบร้อย" : `ตัดดอกรอบที่ ${loan.rolloverCount + 1}`),
        },
      });

      // Update Loan
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          remainingPrincipal: newRemainingPrincipal,
          penaltyAccrued: loan.penaltyAccrued - penaltyPaid,
          accruedInterest: underpaidCarryover,
          rolloverCount: isSettlement ? loan.rolloverCount : loan.rolloverCount + 1,
          status: newStatus,
          currentDueDate: isSettlement ? loan.currentDueDate : nextDueDate,
          closedAt: isSettlement ? paymentDate : null,
        },
      });

      // Update Borrower completed cycles and auto tier progression if settled
      if (isSettlement) {
        const currentBorrower = await tx.borrower.findUnique({
          where: { id: loan.borrowerId },
        });
        const newCycles = (currentBorrower?.completedCycles || 0) + 1;
        let newGrade = currentBorrower?.creditGrade || "NEW";
        let newLimit = currentBorrower?.creditLimit || 2000;

        if (newGrade !== "BLACKLIST") {
          if (newCycles >= 6) {
            newGrade = "VIP";
            newLimit = Math.max(newLimit, 10000);
          } else if (newCycles >= 3) {
            newGrade = "GOOD";
            newLimit = Math.max(newLimit, 5000);
          }
        }

        await tx.borrower.update({
          where: { id: loan.borrowerId },
          data: {
            completedCycles: newCycles,
            creditGrade: newGrade as any,
            creditLimit: newLimit,
          },
        });
      }

      // Record in CashLedger
      await tx.cashLedger.create({
        data: {
          type: "REPAYMENT",
          amount: amountPaid,
          referenceId: loan.id,
          description: isSettlement
            ? `รับปิดยอดสัญญา ${loan.borrower.fullName} โดย ${actorUsername} (${amountPaid.toLocaleString()} ฿)`
            : `รับชำระดอกเบี้ย/โปะต้น ${loan.borrower.fullName} โดย ${actorUsername} (${amountPaid.toLocaleString()} ฿)`,
          createdAt: paymentDate,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorUserId || loan.agentId,
          action: "PAYMENT_COLLECT",
          targetId: payment.id,
          details: JSON.stringify({
            collector: actorUsername,
            borrowerName: loan.borrower.fullName,
            amountPaid,
            principalCut,
            currentInterestPaid,
            penaltyPaid,
            remainingPrincipal: newRemainingPrincipal,
            isSettlement,
            paidAt: paymentDate.toISOString(),
            isBackdated: Boolean(input.paidAt),
          }),
        },
      });

      return {
        paymentId: payment.id,
        amountPaid,
        principalCut,
        currentInterestPaid,
        penaltyPaid,
        newRemainingPrincipal,
        isSettlement,
        borrowerName: loan.borrower.fullName,
      };
    });

    await saveDbToBlob();

    safeRevalidate("/");
    safeRevalidate("/ledger");
    safeRevalidate("/borrowers");

    return { 
      success: true, 
      receipt: result 
    };
  } catch (error: any) {
    console.error("Payment action error:", error);
    return { success: false, error: error.message ?? "บันทึกการชำระเงินล้มเหลว" };
  }
}
