import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LoanContract } from "@/components/LoanContract";
import { syncDbFromBlob } from "@/lib/blob-sync";
import { FileQuestion, ArrowLeft, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "สัญญากู้ยืมเงิน | Loan Tracker",
};

interface ContractPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractPage({ params }: ContractPageProps) {
  // 1. Force sync latest DB from Vercel Blob
  await syncDbFromBlob(true);
  const { id } = await params;

  let loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      borrower: true,
      agent: true,
    },
  });

  // 2. If not found on first attempt, retry once after a short delay (in case Blob upload just finished)
  if (!loan) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await syncDbFromBlob(true);

    loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: true,
        agent: true,
      },
    });
  }

  // 3. If still not found, render a helpful fallback with navigation rather than a blank 404
  if (!loan) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="size-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mb-4 shadow-xs">
          <FileQuestion className="size-8" />
        </div>
        <h1 className="text-lg font-bold text-zinc-900">กำลังซิงค์ข้อมูลสัญญา หรือไม่พบสัญญาในระบบ</h1>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          หากเพิ่งสร้างสัญญานี้ ข้อมูลกำลังซิงค์ข้ามคลาวด์ หรือสัญญานี้อาจถูกลบออกไปแล้ว
        </p>

        <div className="mt-5 flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft className="size-3.5" />
            <span>กลับหน้าแดชบอร์ด</span>
          </Link>

          <Link
            href={`/loans/${id}/contract`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-all"
          >
            <RefreshCw className="size-3.5" />
            <span>ลองโหลดใหม่</span>
          </Link>
        </div>
      </div>
    );
  }

  return <LoanContract loan={loan} />;
}
