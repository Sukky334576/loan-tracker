import { prisma } from "@/lib/prisma";
import { 
  LedgerClient, 
  LedgerTransaction, 
  PnLMetrics, 
  AgentPerformance, 
  AuditLogItem 
} from "@/components/LedgerClient";
import { syncDbFromBlob } from "@/lib/blob-sync";
import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LedgerPage() {
  await syncDbFromBlob(true);
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // 1. Transactions (All entries for complete date-range and monthly reporting)
  const transactions = await prisma.cashLedger.findMany({
    orderBy: { createdAt: "desc" },
  });

  let totalInjected = 0;
  let totalDisbursed = 0;
  let totalRepaid = 0;
  let totalWithdrawn = 0;

  transactions.forEach((tx) => {
    if (tx.type === "CAPITAL_INJECTION") totalInjected += tx.amount;
    if (tx.type === "DISBURSEMENT") totalDisbursed += tx.amount;
    if (tx.type === "REPAYMENT") totalRepaid += tx.amount;
    if (tx.type === "WITHDRAWAL") totalWithdrawn += tx.amount;
  });

  const cashBalance = totalInjected + totalRepaid - totalDisbursed - totalWithdrawn;

  // 2. Payments & Loans for P&L
  const payments = await prisma.payment.findMany({
    include: {
      loan: {
        include: {
          borrower: true,
          agent: true,
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const loans = await prisma.loan.findMany({
    include: {
      borrower: true,
      agent: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate P&L figures
  const principalRecovered = payments.reduce(
    (sum, p) => sum + Number(p.principalCut || 0),
    0
  );

  const paymentInterest = payments.reduce(
    (sum, p) =>
      sum +
      Number(p.currentInterestPaid || 0) +
      Number(p.accruedInterestPaid || 0),
    0
  );

  const upfrontInterest = loans.reduce((sum, l) => {
    if (l.isUpfrontDeduction) {
      const upfront =
        l.upfrontDeductionAmount > 0
          ? l.upfrontDeductionAmount
          : l.initialPrincipal * l.interestRate;
      return sum + Number(upfront);
    }
    return sum;
  }, 0);

  const interestProfit = paymentInterest + upfrontInterest;

  const lateFeeIncome = payments.reduce(
    (sum, p) => sum + Number(p.penaltyPaid || 0),
    0
  );

  const badDebtLoss = loans
    .filter((l) => l.status === "BAD_DEBT")
    .reduce((sum, l) => sum + Number(l.remainingPrincipal || 0), 0);

  const netProfit = interestProfit + lateFeeIncome - badDebtLoss;

  const pnlMetrics: PnLMetrics = {
    principalRecovered,
    interestProfit,
    lateFeeIncome,
    badDebtLoss,
    netProfit,
  };

  // 3. Agent Performance
  const users = await prisma.user.findMany();
  const agentPerformanceList: AgentPerformance[] = users.map((u) => {
    // Loans created by this agent
    const userLoans = loans.filter(
      (l) => l.agentId === u.id || l.agent?.username === u.username
    );
    const loansCreatedCount = userLoans.length;
    const userDisbursed = userLoans.reduce(
      (sum, l) => sum + Number(l.initialPrincipal || 0),
      0
    );

    // Payments collected by this agent
    const userPayments = payments.filter(
      (p) =>
        p.collectedBy === u.username ||
        p.verifiedBy === u.username ||
        (!p.collectedBy && p.loan?.agent?.username === u.username)
    );
    const paymentsCollectedCount = userPayments.length;
    const totalCollected = userPayments.reduce(
      (sum, p) => sum + Number(p.amountPaid || 0),
      0
    );
    const principalCollected = userPayments.reduce(
      (sum, p) => sum + Number(p.principalCut || 0),
      0
    );
    const interestCollected = userPayments.reduce(
      (sum, p) =>
        sum +
        Number(p.currentInterestPaid || 0) +
        Number(p.accruedInterestPaid || 0),
      0
    );
    const penaltyCollected = userPayments.reduce(
      (sum, p) => sum + Number(p.penaltyPaid || 0),
      0
    );

    return {
      username: u.username,
      name: u.name,
      role: u.role,
      loansCreatedCount,
      totalDisbursed: userDisbursed,
      paymentsCollectedCount,
      totalCollected,
      principalCollected,
      interestCollected,
      penaltyCollected,
    };
  });

  // 4. Audit Logs (Restricted to OWNER only)
  let auditLogs: AuditLogItem[] = [];
  if (session.role === "OWNER") {
    try {
      const rawLogs = await prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      auditLogs = rawLogs.map((log) => ({
        id: log.id,
        actor: log.user?.username || log.userId,
        action: log.action,
        targetId: log.targetId,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  }

  const mappedTransactions: LedgerTransaction[] = transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    createdAt: tx.createdAt.toISOString(),
  }));

  return (
    <LedgerClient
      transactions={mappedTransactions}
      totalInjected={totalInjected}
      totalDisbursed={totalDisbursed}
      totalRepaid={totalRepaid}
      totalWithdrawn={totalWithdrawn}
      cashBalance={cashBalance}
      userRole={session?.role ?? "OWNER"}
      pnlMetrics={pnlMetrics}
      agentPerformances={agentPerformanceList}
      auditLogs={auditLogs}
    />
  );
}
