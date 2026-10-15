import { prisma } from "@/lib/prisma";
import { NewLoanForm } from "@/components/NewLoanForm";
import { syncDbFromBlob } from "@/lib/blob-sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewLoanPage() {
  await syncDbFromBlob(true);

  const [borrowers, ledgerEntries] = await Promise.all([
    prisma.borrower.findMany({
      where: { 
        deletedAt: null,
        creditGrade: { not: "BLACKLIST" },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        creditGrade: true,
        creditLimit: true,
        loans: {
          where: {
            status: { in: ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"] },
            deletedAt: null,
          },
          select: { remainingPrincipal: true },
        },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.cashLedger.findMany(),
  ]);

  const cashBalance = ledgerEntries.reduce((sum, entry) => {
    if (entry.type === "CAPITAL_INJECTION" || entry.type === "REPAYMENT") {
      return sum + entry.amount;
    }
    return sum - entry.amount;
  }, 0);

  const formattedBorrowers = borrowers.map((b) => {
    const activePrincipal = b.loans.reduce((sum, l) => sum + l.remainingPrincipal, 0);
    const availableCredit = Math.max(0, b.creditLimit - activePrincipal);

    return {
      id: b.id,
      fullName: b.fullName,
      phone: b.phone,
      creditGrade: b.creditGrade,
      creditLimit: b.creditLimit,
      activePrincipal,
      availableCredit,
    };
  });

  return (
    <div className="w-full pb-24 md:pb-12">
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            เปิดสัญญาเงินกู้ใหม่
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            ระบบตรวจสอบเพดานวงเงินและคำนวณวันนัดเก็บเงินอัตโนมัติ
          </p>
        </div>

        <NewLoanForm 
          borrowers={formattedBorrowers} 
          cashBalance={cashBalance}
        />
      </main>
    </div>
  );
}
