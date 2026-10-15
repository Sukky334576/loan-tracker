import { prisma } from "@/lib/prisma";
import { BorrowersClient, BorrowerItem } from "@/components/BorrowersClient";
import { syncDbFromBlob } from "@/lib/blob-sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BorrowersPage() {
  await syncDbFromBlob(true);

  const borrowers = await prisma.borrower.findMany({
    where: { deletedAt: null },
    include: {
      loans: {
        where: { deletedAt: null },
        select: {
          id: true,
          remainingPrincipal: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedBorrowers: BorrowerItem[] = borrowers.map((b) => ({
    id: b.id,
    fullName: b.fullName,
    phone: b.phone,
    workplace: b.workplace,
    creditGrade: b.creditGrade,
    creditLimit: b.creditLimit,
    completedCycles: b.completedCycles,
    loans: b.loans.map((l) => ({
      id: l.id,
      remainingPrincipal: l.remainingPrincipal,
      status: l.status,
    })),
  }));

  return <BorrowersClient initialBorrowers={mappedBorrowers} />;
}
