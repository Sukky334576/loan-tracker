import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LoanContract } from "@/components/LoanContract";
import { syncDbFromBlob } from "@/lib/blob-sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "ลงนามสัญญากู้ยืมเงินอิเล็กทรอนิกส์",
};

interface SignPageProps {
  params: Promise<{ id: string }>;
}

export default async function SignPage({ params }: SignPageProps) {
  await syncDbFromBlob(true);
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

  return (
    <div className="pb-12">
      {/* Mobile Notice Bar */}
      <div className="bg-zinc-900 text-white px-4 py-2.5 text-center text-xs font-medium shadow-sm print:hidden">
        📝 กรุณาตรวจสอบรายละเอียดสัญญา และกดที่ช่องลายเซ็นเพื่อลงนามด้วยนิ้วมือ
      </div>
      <LoanContract loan={loan} isClientSignMode={true} />
    </div>
  );
}
