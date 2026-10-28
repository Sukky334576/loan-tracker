"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { syncDbFromBlob, saveDbToBlob } from "@/lib/blob-sync";
import { getSession } from "@/app/actions/auth";
import { logAudit } from "@/lib/audit";

export async function saveSignatureAction(params: {
  loanId: string;
  role: "borrower" | "guarantor";
  signatureDataUrl: string;
}) {
  try {
    await syncDbFromBlob(true);
    const { loanId, role, signatureDataUrl } = params;

    if (!loanId || !signatureDataUrl) {
      return { success: false, error: "ข้อมูลไม่ครบถ้วน" };
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) {
      return { success: false, error: "ไม่พบข้อมูลสัญญาเงินกู้" };
    }

    const updateData: {
      borrowerSignature?: string;
      guarantorSignature?: string;
      signedAt?: Date;
    } = {};

    if (role === "borrower") {
      updateData.borrowerSignature = signatureDataUrl;
    } else {
      updateData.guarantorSignature = signatureDataUrl;
    }

    // Check if contract is fully signed
    const willHaveBorrowerSig = role === "borrower" || !!loan.borrowerSignature;
    const willHaveGuarantorSig =
      loan.contractType !== "GUARANTEED" ||
      role === "guarantor" ||
      !!loan.guarantorSignature;

    if (willHaveBorrowerSig && willHaveGuarantorSig) {
      updateData.signedAt = new Date();
    }

    await prisma.loan.update({
      where: { id: loanId },
      data: updateData,
    });

    const session = await getSession();
    await logAudit(
      session?.id || loan.agentId,
      "CONTRACT_SIGN",
      loan.id,
      {
        borrowerName: loan.borrower.fullName,
        signerRole: role,
        contractType: loan.contractType,
        fullySigned: willHaveBorrowerSig && willHaveGuarantorSig,
        signedBy: session?.username || role,
      }
    );

    await saveDbToBlob();

    safeRevalidate(`/loans/${loanId}/contract`);
    safeRevalidate(`/sign/${loanId}`);
    safeRevalidate("/");

    return { success: true };
  } catch (error: any) {
    console.error("Save signature error:", error);
    return { success: false, error: error.message ?? "บันทึกลายเซ็นไม่สำเร็จ" };
  }
}

export async function clearSignatureAction(params: {
  loanId: string;
  role: "borrower" | "guarantor";
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return { success: false, error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการลบลายมือชื่อสัญญา" };
    }

    await syncDbFromBlob(true);

    const { loanId, role } = params;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) {
      return { success: false, error: "ไม่พบข้อมูลสัญญาเงินกู้" };
    }

    const updateData: {
      borrowerSignature?: string | null;
      guarantorSignature?: string | null;
      signedAt?: Date | null;
    } = {
      signedAt: null,
    };

    if (role === "borrower") {
      updateData.borrowerSignature = null;
    } else {
      updateData.guarantorSignature = null;
    }

    await prisma.loan.update({
      where: { id: loanId },
      data: updateData,
    });

    await logAudit(
      session?.id || loan.agentId,
      "CONTRACT_CLEAR_SIGN",
      loan.id,
      {
        borrowerName: loan.borrower.fullName,
        clearedRole: role,
        clearedBy: session?.username || "OWNER",
      }
    );

    await saveDbToBlob();

    safeRevalidate(`/loans/${loanId}/contract`);
    safeRevalidate(`/sign/${loanId}`);
    safeRevalidate("/");

    return { success: true };
  } catch (error: any) {
    console.error("Clear signature error:", error);
    return { success: false, error: error.message ?? "ลบลายเซ็นไม่สำเร็จ" };
  }
}
