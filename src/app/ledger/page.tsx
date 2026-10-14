import { prisma } from "@/lib/prisma";
import { LedgerClient, LedgerTransaction } from "@/components/LedgerClient";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const transactions = await prisma.cashLedger.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
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
    />
  );
}
