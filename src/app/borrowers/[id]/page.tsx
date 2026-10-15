import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { syncDbFromBlob } from "@/lib/blob-sync";
import { BorrowerProfileClient } from "@/components/BorrowerProfileClient";
import { getSession } from "@/app/actions/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BorrowerDetailPage({ params }: Props) {
  await syncDbFromBlob(true);
  const session = await getSession();
  const { id } = await params;

  const borrower = await prisma.borrower.findUnique({
    where: { id, deletedAt: null },
    include: {
      loans: {
        where: { deletedAt: null },
        include: {
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!borrower) {
    notFound();
  }

  const activeLoans = borrower.loans.filter((l) =>
    ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"].includes(l.status)
  );

  const settledLoans = borrower.loans.filter((l) => l.status === "SETTLED");

  const activePrincipal = activeLoans.reduce((sum, l) => sum + l.remainingPrincipal, 0);
  const availableCredit = Math.max(0, borrower.creditLimit - activePrincipal);

  return (
    <BorrowerProfileClient
      borrower={{
        id: borrower.id,
        citizenId: borrower.citizenId,
        fullName: borrower.fullName,
        nickname: borrower.nickname,
        phone: borrower.phone,
        workplace: borrower.workplace,
        addressOnCard: borrower.addressOnCard,
        facebookUrl: borrower.facebookUrl,
        backupPhone: borrower.backupPhone,
        creditGrade: borrower.creditGrade,
        creditLimit: borrower.creditLimit,
        completedCycles: borrower.completedCycles,
        createdAt: borrower.createdAt.toISOString(),
        guarantorName: borrower.guarantorName,
        guarantorPhone: borrower.guarantorPhone,
        idCardPhoto: borrower.idCardPhoto,
        storeOrHomePhoto: borrower.storeOrHomePhoto,
        activePrincipal,
        availableCredit,
        loans: borrower.loans.map((l) => ({
          id: l.id,
          initialPrincipal: l.initialPrincipal,
          remainingPrincipal: l.remainingPrincipal,
          termType: l.termType,
          interestRate: l.interestRate,
          status: l.status,
          rolloverCount: l.rolloverCount,
          penaltyAccrued: l.penaltyAccrued,
          currentDueDate: l.currentDueDate.toISOString(),
          createdAt: l.createdAt.toISOString(),
          closedAt: l.closedAt?.toISOString() ?? null,
          paymentsCount: l.payments.length,
          totalPaid: l.payments.reduce((s, p) => s + p.amountPaid, 0),
          payments: l.payments.map((p) => ({
            id: p.id,
            amountPaid: p.amountPaid,
            paidAt: p.paidAt.toISOString(),
            slipUrl: p.slipUrl,
            paymentType: p.paymentType,
          })),
        })),
      }}
      userRole={session?.role ?? "OWNER"}
    />
  );
}
