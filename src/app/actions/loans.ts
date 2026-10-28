"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { syncDbFromBlob, saveDbToBlob } from "@/lib/blob-sync";

import { getSession } from "@/app/actions/auth";

export interface CreateLoanInput {
  borrowerId: string;
  principal: number;
  termType: "DAYS_7" | "DAYS_10" | "CUSTOM";
  customDays?: number;
  customInterestRate?: number;
  processingFee: number;
  contractType?: "STANDARD" | "GUARANTEED";
  contractPlace?: string;
  dailyPenaltyRate?: number;
  isUpfrontDeduction?: boolean;
  guarantorName?: string;
  guarantorCitizenId?: string;
  guarantorPhone?: string;
  guarantorAddress?: string;
  startDate?: string;
}

export async function createLoanAction(input: CreateLoanInput) {
  try {
    await syncDbFromBlob(true);

    const session = await getSession();
    const isAgent = session?.role === "AGENT";

    const {
      borrowerId,
      principal,
      termType,
      customDays,
      customInterestRate,
      processingFee,
      contractType = "STANDARD",
      contractPlace = "บ้านเป้า",
      dailyPenaltyRate = 50.0,
      isUpfrontDeduction = false,
      guarantorName,
      guarantorCitizenId,
      guarantorPhone,
      guarantorAddress,
      startDate: inputStartDate,
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

    // Check dynamic overdue loans for watchlist / blacklist
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hasOverdueLoans = borrower.loans.some((l) => {
      const due = new Date(l.currentDueDate);
      return due.getTime() < startOfToday.getTime();
    });

    const isRestricted =
      borrower.creditGrade === "BLACKLIST" ||
      borrower.creditGrade === "WATCHLIST" ||
      hasOverdueLoans;

    if (isAgent && isRestricted) {
      return {
        success: false,
        error: `ลูกหนี้ติดสถานะ ${borrower.creditGrade === "BLACKLIST" ? "BLACKLIST" : "เฝ้าระวัง (WATCHLIST/ค้างชำระ)"} — ไม่อนุญาตให้สายตรวจ (Agent) เปิดสัญญาใหม่ (สงวนสิทธิ์เฉพาะนายทุนเท่านั้น)`,
      };
    }

    if (!isAgent && borrower.creditGrade === "BLACKLIST") {
      // Owner override allowed or can unlock
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
    let interestRate = 0.20;
    let termDays = 10;
    if (termType === "DAYS_7") {
      interestRate = 0.15;
      termDays = 7;
    } else if (termType === "DAYS_10") {
      interestRate = 0.20;
      termDays = 10;
    } else if (termType === "CUSTOM") {
      interestRate = customInterestRate !== undefined ? Number(customInterestRate) : 0.20;
      termDays = customDays !== undefined && Number(customDays) > 0 ? Number(customDays) : 10;
    }

    // Support backdating for loan start date
    let startDate = new Date();
    if (inputStartDate) {
      const parsed = new Date(inputStartDate.includes("T") ? inputStartDate : `${inputStartDate}T09:00:00`);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }

    const currentDueDate = new Date(startDate);
    currentDueDate.setDate(currentDueDate.getDate() + termDays);
    currentDueDate.setHours(18, 0, 0, 0);

    // If backdated due date is already in the past, evaluate overdue and accrued penalty
    let initialStatus: "ACTIVE" | "OVERDUE" = "ACTIVE";
    let initialPenalty = 0;
    if (currentDueDate.getTime() < startOfToday.getTime()) {
      initialStatus = "OVERDUE";
      const diffTime = currentDueDate.getTime() - startOfToday.getTime();
      const overdueDays = Math.abs(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      initialPenalty = overdueDays * (dailyPenaltyRate || 50.0);
    }

    // 4. Upfront Interest & Disbursement Calculations
    const cycleInterest = principal * interestRate;
    const upfrontDeductionAmount = isUpfrontDeduction ? cycleInterest : 0;
    const disbursedAmount = Math.max(0, principal - upfrontDeductionAmount - processingFee);

    // 5. Verify Cash Reserve
    const ledgerEntries = await prisma.cashLedger.findMany();
    const currentCash = ledgerEntries.reduce((sum, entry) => {
      if (entry.type === "CAPITAL_INJECTION" || entry.type === "REPAYMENT") return sum + entry.amount;
      return sum - entry.amount;
    }, 0);

    if (disbursedAmount > currentCash) {
      return {
        success: false,
        error: `เงินสดสำรองในกองกลางไม่เพียงพอต่อการปล่อยกู้ (กองกลางคงเหลือ ${currentCash.toLocaleString()} ฿, ต้องโอนจริง ${disbursedAmount.toLocaleString()} ฿)`,
      };
    }

    // 5. Find current active agent or default
    const agent = await prisma.user.findFirst({
      where: { role: "AGENT" },
    });
    const agentId = session?.id ?? agent?.id ?? borrower.agentId;

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
          status: initialStatus,
          penaltyAccrued: initialPenalty,
          startDate,
          currentDueDate,
          createdAt: startDate,
        },
      });

      // B. Create Cash Ledger Entry (Disbursement)
      await tx.cashLedger.create({
        data: {
          type: "DISBURSEMENT",
          amount: disbursedAmount,
          referenceId: loan.id,
          description: isUpfrontDeduction
            ? `ปล่อยกู้ ${borrower.fullName} โดย ${session?.username || "เจ้าหน้าที่"} (ยอดกู้ ${principal.toLocaleString()} ฿ หักดอกล่วงหน้า ${upfrontDeductionAmount.toLocaleString()} ฿ โอนจริง ${disbursedAmount.toLocaleString()} ฿)`
            : `ปล่อยกู้ ${borrower.fullName} โดย ${session?.username || "เจ้าหน้าที่"} (ยอดกู้ ${principal.toLocaleString()} ฿ หักค่าดำเนินการ ${processingFee} ฿ โอนจริง ${disbursedAmount.toLocaleString()} ฿)`,
          createdAt: startDate,
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
            createdAt: startDate,
          },
        });
      }

      // D. Audit Log
      await tx.auditLog.create({
        data: {
          userId: agentId,
          action: "LOAN_CREATE",
          targetId: loan.id,
          details: JSON.stringify({
            creator: session?.username || "AGENT",
            borrowerName: borrower.fullName,
            principal,
            termType,
            interestRate,
            contractType,
            isUpfrontDeduction,
            disbursedAmount,
            guarantorName,
            startDate: startDate.toISOString(),
            isBackdated: Boolean(inputStartDate),
          }),
        },
      });

      return loan;
    });

    await saveDbToBlob();

    safeRevalidate("/");
    safeRevalidate("/borrowers");
    safeRevalidate("/ledger");
    safeRevalidate(`/loans/${result.id}/contract`);
    return { success: true, loanId: result.id };
  } catch (error: any) {
    console.error("Create loan error:", error);
    return { success: false, error: error.message ?? "เกิดข้อผิดพลาดในการเปิดสัญญา" };
  }
}

export async function deleteLoanAction(loanId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return { success: false, error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการลบหรือยกเลิกสัญญาเงินกู้" };
    }

    await syncDbFromBlob(true);

    if (!loanId) {
      return { success: false, error: "ไม่พบรหัสสัญญาเงินกู้" };
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) {
      return { success: false, error: "ไม่พบข้อมูลสัญญากู้เงินนี้" };
    }

    // Soft delete loan
    await prisma.loan.update({
      where: { id: loanId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.id ?? loan.agentId,
        action: "LOAN_DELETE",
        targetId: loan.id,
        details: JSON.stringify({
          deletedBy: session?.username || "OWNER",
          borrowerName: loan.borrower?.fullName,
          initialPrincipal: loan.initialPrincipal,
          remainingPrincipal: loan.remainingPrincipal,
          status: loan.status,
        }),
      },
    });

    await saveDbToBlob();

    safeRevalidate("/");
    safeRevalidate("/borrowers");
    safeRevalidate("/ledger");

    return { success: true };
  } catch (error: any) {
    console.error("Delete loan error:", error);
    return { success: false, error: error.message ?? "ลบสัญญาล้มเหลว" };
  }
}

export async function writeOffBadDebtAction(loanId: string, reason?: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return { success: false, error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการตัดจำหน่ายหนี้สูญ" };
    }

    await syncDbFromBlob(true);

    if (!loanId) {
      return { success: false, error: "ไม่พบรหัสสัญญาเงินกู้" };
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) {
      return { success: false, error: "ไม่พบข้อมูลสัญญากู้เงินนี้" };
    }

    if (loan.status === "SETTLED" || loan.status === "BAD_DEBT") {
      return { success: false, error: "สัญญานี้ไม่ได้อยู่ในสถานะค้างชำระ" };
    }

    const lossAmount = loan.remainingPrincipal;

    await prisma.$transaction(async (tx) => {
      // 1. Update loan status to BAD_DEBT
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: "BAD_DEBT",
          closedAt: new Date(),
        },
      });

      // 2. Set borrower to BLACKLIST
      await tx.borrower.update({
        where: { id: loan.borrowerId },
        data: {
          creditGrade: "BLACKLIST",
        },
      });

      // 3. Record in CashLedger as WITHDRAWAL (Loss)
      await tx.cashLedger.create({
        data: {
          type: "WITHDRAWAL",
          amount: lossAmount,
          referenceId: loan.id,
          description: `ตัดจำหน่ายหนี้สูญ ${loan.borrower.fullName} (ยอดเงินต้นคงค้าง ${lossAmount.toLocaleString()} ฿)${reason ? ` - ${reason}` : ""}`,
        },
      });

      // 4. Audit Log
      const ownerUser = await tx.user.findFirst({ where: { role: "OWNER" } });
      const actorId = session?.id || ownerUser?.id || "SYSTEM";
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "LOAN_BAD_DEBT",
          targetId: loan.id,
          details: JSON.stringify({
            borrowerName: loan.borrower.fullName,
            borrowerId: loan.borrowerId,
            lossAmount,
            reason: reason || "ลูกหนี้ค้างชำระเกินกำหนด ไม่สามารถตามตัวได้",
          }),
        },
      });
    });

    await saveDbToBlob();

    safeRevalidate("/");
    safeRevalidate("/borrowers");
    safeRevalidate(`/borrowers/${loan.borrowerId}`);
    safeRevalidate("/ledger");

    return { success: true };
  } catch (error: any) {
    console.error("writeOffBadDebtAction error:", error);
    return { success: false, error: error.message ?? "ตัดหนี้สูญล้มเหลว" };
  }
}


