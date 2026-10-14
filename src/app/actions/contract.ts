"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";

export async function saveSignatureAction(params: {
  loanId: string;
  role: "borrower" | "guarantor";
  signatureDataUrl: string;
}) {
  try {
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
    const { loanId, role } = params;

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

    safeRevalidate(`/loans/${loanId}/contract`);
    safeRevalidate(`/sign/${loanId}`);
    safeRevalidate("/");

    return { success: true };
  } catch (error: any) {
    console.error("Clear signature error:", error);
    return { success: false, error: error.message ?? "ลบลายเซ็นไม่สำเร็จ" };
  }
}
