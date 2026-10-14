"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";

export interface RecordPaymentInput {
  loanId: string;
  payType: "INTEREST" | "PRINCIPAL_CUT" | "SETTLE";
  amountPaid: number;
  notes?: string;
  slipUrl?: string;
}

export async function recordPaymentAction(input: RecordPaymentInput) {
  try {
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

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + termDays);
    nextDueDate.setHours(18, 0, 0, 0);

    // 2. Execute Atomic Transaction
    await prisma.$transaction(async (tx) => {
      // Create Payment Record
      await tx.payment.create({
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
          paidAt: new Date(),
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
          status: isSettlement ? "SETTLED" : underpaidCarryover > 0 ? "PARTIALLY_PAID" : "ACTIVE",
          currentDueDate: isSettlement ? loan.currentDueDate : nextDueDate,
          closedAt: isSettlement ? new Date() : null,
        },
      });

      // Update Borrower completed cycles if settled
      if (isSettlement) {
        await tx.borrower.update({
          where: { id: loan.borrowerId },
          data: {
            completedCycles: { increment: 1 },
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
            ? `รับปิดยอดสัญญา ${loan.borrower.fullName} (${amountPaid.toLocaleString()} ฿)`
            : `รับชำระดอกเบี้ย/โปะต้น ${loan.borrower.fullName} (${amountPaid.toLocaleString()} ฿)`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: loan.agentId,
          action: isSettlement ? "SETTLE_LOAN" : "PAYMENT_RECEIVED",
          targetId: loan.id,
          details: JSON.stringify({
            amountPaid,
            principalCut,
            currentInterestPaid,
            penaltyPaid,
            remainingPrincipal: newRemainingPrincipal,
          }),
        },
      });
    });

    safeRevalidate("/");
    safeRevalidate("/ledger");
    safeRevalidate("/borrowers");

    return { success: true };
  } catch (error: any) {
    console.error("Payment action error:", error);
    return { success: false, error: error.message ?? "บันทึกการชำระเงินล้มเหลว" };
  }
}
