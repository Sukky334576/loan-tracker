"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CreateLoanInput {
  borrowerId: string;
  principal: number;
  termType: "DAYS_7" | "DAYS_10";
  processingFee: number;
  contractType?: "STANDARD" | "GUARANTEED";
  contractPlace?: string;
  dailyPenaltyRate?: number;
  isUpfrontDeduction?: boolean;
  guarantorName?: string;
  guarantorCitizenId?: string;
  guarantorPhone?: string;
  guarantorAddress?: string;
}

export async function createLoanAction(input: CreateLoanInput) {
  try {
    const {
      borrowerId,
      principal,
      termType,
      processingFee,
      contractType = "STANDARD",
      contractPlace = "บ้านเป้า",
      dailyPenaltyRate = 50.0,
      isUpfrontDeduction = false,
      guarantorName,
      guarantorCitizenId,
      guarantorPhone,
      guarantorAddress,
    } = input;

    if (!borrowerId || principal <= 0) {
      return { success: false, error: "กรุณาเลือกลูกหนี้และระบุเงินต้นให้ถูกต้อง" };
    }

    // 1. Fetch Borrower with active loans
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
      include: {
        loans: {
          where: {
            status: { in: ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"] },
            deletedAt: null,
          },
        },
      },
    });

    if (!borrower) {
      return { success: false, error: "ไม่พบข้อมูลลูกหนี้" };
    }

    if (borrower.creditGrade === "BLACKLIST") {
      return { success: false, error: "ลูกหนี้ติดแบล็กลิสต์ ไม่อนุญาตให้เปิดสัญญาใหม่" };
    }

    // 2. Check Credit Limit
    const activePrincipal = borrower.loans.reduce(
      (sum, l) => sum + l.remainingPrincipal,
      0
    );

    if (activePrincipal + principal > borrower.creditLimit) {
      return {
        success: false,
        error: `ยอดเงินต้นรวม (${(activePrincipal + principal).toLocaleString()} ฿) เกินเพดานวงเงินของลูกหนี้ (${borrower.creditLimit.toLocaleString()} ฿)`,
      };
    }

    // 3. Calculate Interest Rate and Due Date
    const interestRate = termType === "DAYS_7" ? 0.15 : 0.20;
    const termDays = termType === "DAYS_7" ? 7 : 10;

    const startDate = new Date();
    const currentDueDate = new Date(startDate);
    currentDueDate.setDate(currentDueDate.getDate() + termDays);
    currentDueDate.setHours(18, 0, 0, 0);

    // 4. Upfront Interest & Disbursement Calculations
    const cycleInterest = principal * interestRate;
    const upfrontDeductionAmount = isUpfrontDeduction ? cycleInterest : 0;
    const disbursedAmount = Math.max(0, principal - upfrontDeductionAmount - processingFee);

    // 5. Find first active agent or default
    const agent = await prisma.user.findFirst({
      where: { role: "AGENT" },
    });
    const agentId = agent?.id ?? borrower.agentId;

    // 6. Execute Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      // A. Create Loan
      const loan = await tx.loan.create({
        data: {
          borrowerId: borrower.id,
          agentId,
          initialPrincipal: principal,
          remainingPrincipal: principal,
          termType,
          interestRate,
          processingFee,
          contractType,
          contractPlace: contractPlace || "บ้านเป้า",
          dailyPenaltyRate: dailyPenaltyRate || 50.0,
          isUpfrontDeduction,
          upfrontDeductionAmount,
          disbursedAmount,
          guarantorName: guarantorName?.trim() || null,
          guarantorCitizenId: guarantorCitizenId?.trim() || null,
          guarantorPhone: guarantorPhone?.trim() || null,
          guarantorAddress: guarantorAddress?.trim() || null,
          status: "ACTIVE",
          startDate,
          currentDueDate,
        },
      });

      // B. Create Cash Ledger Entry (Disbursement)
      await tx.cashLedger.create({
        data: {
          type: "DISBURSEMENT",
          amount: disbursedAmount,
          referenceId: loan.id,
          description: isUpfrontDeduction
            ? `ปล่อยกู้ ${borrower.fullName} (ยอดกู้ ${principal.toLocaleString()} ฿ หักดอกล่วงหน้า ${upfrontDeductionAmount.toLocaleString()} ฿ โอนจริง ${disbursedAmount.toLocaleString()} ฿)`
            : `ปล่อยกู้ ${borrower.fullName} (ยอดกู้ ${principal.toLocaleString()} ฿ หักค่าดำเนินการ ${processingFee} ฿ โอนจริง ${disbursedAmount.toLocaleString()} ฿)`,
        },
      });

      // C. If upfront interest is deducted, also log the interest profit in ledger
      if (isUpfrontDeduction && upfrontDeductionAmount > 0) {
        await tx.cashLedger.create({
          data: {
            type: "REPAYMENT",
            amount: upfrontDeductionAmount,
            referenceId: loan.id,
            description: `รับดอกเบี้ยล่วงหน้างวดแรก ${borrower.fullName} (${upfrontDeductionAmount.toLocaleString()} ฿)`,
          },
        });
      }

      // D. Audit Log
      await tx.auditLog.create({
        data: {
          userId: agentId,
          action: "CREATE_LOAN",
          targetId: loan.id,
          details: JSON.stringify({
            borrowerName: borrower.fullName,
            principal,
            termType,
            interestRate,
            contractType,
            isUpfrontDeduction,
            disbursedAmount,
            guarantorName,
          }),
        },
      });

      return loan;
    });

    revalidatePath("/");
    revalidatePath("/borrowers");
    return { success: true, loanId: result.id };
  } catch (error: any) {
    console.error("Create loan error:", error);
    return { success: false, error: error.message ?? "เกิดข้อผิดพลาดในการเปิดสัญญา" };
  }
}
