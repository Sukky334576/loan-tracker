import { prisma } from "@/lib/prisma";
import { syncDbFromBlob } from "@/lib/blob-sync";

export async function getDashboardData() {
  await syncDbFromBlob(true);
  const now = new Date();
  
  // Start and end of today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfTomorrow = new Date(now);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
  endOfTomorrow.setHours(23, 59, 59, 999);

  // Fetch active, overdue, partially paid, and settled loans
  const loans = await prisma.loan.findMany({
    where: {
      status: {
        in: ["ACTIVE", "OVERDUE", "PARTIALLY_PAID", "SETTLED"],
      },
      deletedAt: null,
    },
    include: {
      borrower: true,
      agent: true,
    },
    orderBy: [
      { status: "desc" }, // OVERDUE / ACTIVE first
      { currentDueDate: "asc" },
    ],
  });

  // Calculate days diff and auto overdue for each loan
  const mappedLoans = loans.map((loan) => {
    const due = new Date(loan.currentDueDate);
    const diffTime = due.getTime() - startOfToday.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status = loan.status;
    let penaltyAccrued = loan.penaltyAccrued;

    if (status !== "SETTLED" && status !== "BAD_DEBT") {
      if (daysDiff < 0) {
        status = "OVERDUE";
        const overdueDays = Math.abs(daysDiff);
        const penaltyRate = loan.dailyPenaltyRate || 50;
        penaltyAccrued = Math.max(loan.penaltyAccrued, overdueDays * penaltyRate);
      }
    }

    return {
      id: loan.id,
      borrowerName: loan.borrower.fullName,
      phone: loan.borrower.phone,
      workplace: loan.borrower.workplace,
      facebookUrl: loan.borrower.facebookUrl,
      creditGrade: loan.borrower.creditGrade as "NEW" | "GOOD" | "BLACKLIST",
      remainingPrincipal: loan.remainingPrincipal,
      termType: loan.termType as "DAYS_7" | "DAYS_10" | "CUSTOM",
      interestRate: loan.interestRate,
      rolloverCount: loan.rolloverCount,
      accruedInterest: loan.accruedInterest,
      penaltyAccrued,
      status: status as "ACTIVE" | "PARTIALLY_PAID" | "OVERDUE" | "SETTLED" | "BAD_DEBT",
      currentDueDate: loan.currentDueDate.toISOString(),
      daysDiff,
    };
  });

  // Active loans (excluding SETTLED and BAD_DEBT)
  const activeLoans = mappedLoans.filter((l) => l.status !== "SETTLED" && l.status !== "BAD_DEBT");

  // Calculate Aggregated Metrics (for Owner)
  const totalPrincipalInMarket = activeLoans.reduce(
    (sum, l) => sum + l.remainingPrincipal,
    0
  );

  const totalOverdueCount = activeLoans.filter(
    (l) => l.status === "OVERDUE" || l.daysDiff < 0
  ).length;

  const dueTodayCount = activeLoans.filter((l) => l.daysDiff === 0).length;
  const settledCount = mappedLoans.filter((l) => l.status === "SETTLED").length;

  // Total cash ledger balance
  const ledgerEntries = await prisma.cashLedger.findMany();
  const cashBalance = ledgerEntries.reduce((sum, entry) => {
    if (entry.type === "CAPITAL_INJECTION" || entry.type === "REPAYMENT") {
      return sum + entry.amount;
    }
    return sum - entry.amount; // DISBURSEMENT or WITHDRAWAL
  }, 0);

  return {
    loans: mappedLoans,
    metrics: {
      totalPrincipalInMarket,
      totalOverdueCount,
      dueTodayCount,
      cashBalance,
      activeLoansCount: activeLoans.length,
      settledCount,
    },
  };
}
