import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LoanContract } from "@/components/LoanContract";
import { syncDbFromBlob } from "@/lib/blob-sync";

export const metadata = {
  title: "สัญญากู้ยืมเงิน | Loan Tracker",
};

interface ContractPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractPage({ params }: ContractPageProps) {
  await syncDbFromBlob();
  const { id } = await params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      borrower: true,
      agent: true,
    },
  });

  if (!loan) {
    notFound();
  }

  return <LoanContract loan={loan} />;
}
