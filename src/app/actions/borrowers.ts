"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { syncDbFromBlob, saveDbToBlob } from "@/lib/blob-sync";

export interface CreateBorrowerInput {
  citizenId: string;
  fullName: string;
  phone: string;
  workplace?: string;
  addressOnCard?: string;
  facebookUrl?: string;
  backupPhone?: string;
  creditGrade?: "NEW" | "GOOD" | "BLACKLIST";
  creditLimit?: number;
  guarantorName?: string;
  guarantorPhone?: string;
}

export interface UpdateBorrowerInput {
  borrowerId: string;
  fullName?: string;
  phone?: string;
  workplace?: string;
  addressOnCard?: string;
  facebookUrl?: string;
  backupPhone?: string;
  creditGrade?: "NEW" | "GOOD" | "BLACKLIST";
  creditLimit?: number;
  guarantorName?: string;
  guarantorPhone?: string;
}

export async function createBorrowerAction(input: CreateBorrowerInput) {
  try {
    await syncDbFromBlob();

    const {
      citizenId,
      fullName,
      phone,
      workplace,
      addressOnCard,
      facebookUrl,
      backupPhone,
      creditGrade = "NEW",
      creditLimit = 2000,
      guarantorName,
      guarantorPhone,
    } = input;

    if (!fullName || !phone || !citizenId) {
      return { success: false, error: "กรุณากรอกชื่อ-นามสกุล, เบอร์โทร และเลขบัตรประชาชนให้ครบถ้วน" };
    }

    // Check unique citizenId
    const existing = await prisma.borrower.findUnique({
      where: { citizenId },
    });

    if (existing) {
      return { success: false, error: `เลขบัตรประชาชน ${citizenId} มีอยู่ในระบบแล้ว (${existing.fullName})` };
    }

    // Default agent
    const agent = await prisma.user.findFirst({
      where: { role: "AGENT" },
    });

    if (!agent) {
      return { success: false, error: "ไม่พบผู้ดูแลระบบ (Agent)" };
    }

    const borrower = await prisma.borrower.create({
      data: {
        citizenId,
        fullName,
        phone,
        workplace,
        addressOnCard,
        facebookUrl,
        backupPhone,
        creditGrade,
        creditLimit: Number(creditLimit) || 2000,
        guarantorName,
        guarantorPhone,
        agentId: agent.id,
      },
    });

    await saveDbToBlob();

    safeRevalidate("/borrowers");
    safeRevalidate("/loans/new");

    return { success: true, borrowerId: borrower.id };
  } catch (error: any) {
    console.error("Create borrower error:", error);
    return { success: false, error: error.message ?? "บันทึกข้อมูลลูกหนี้ล้มเหลว" };
  }
}

export async function updateBorrowerAction(input: UpdateBorrowerInput) {
  try {
    await syncDbFromBlob();

    const { borrowerId, ...updates } = input;
    if (!borrowerId) {
      return { success: false, error: "ไม่พบรหัสลูกหนี้" };
    }

    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
    });

    if (!borrower) {
      return { success: false, error: "ไม่พบข้อมูลลูกหนี้ในระบบ" };
    }

    await prisma.borrower.update({
      where: { id: borrowerId },
      data: {
        ...(updates.fullName && { fullName: updates.fullName.trim() }),
        ...(updates.phone && { phone: updates.phone.trim() }),
        ...(updates.workplace !== undefined && { workplace: updates.workplace?.trim() || null }),
        ...(updates.addressOnCard !== undefined && { addressOnCard: updates.addressOnCard?.trim() || null }),
        ...(updates.facebookUrl !== undefined && { facebookUrl: updates.facebookUrl?.trim() || null }),
        ...(updates.backupPhone !== undefined && { backupPhone: updates.backupPhone?.trim() || null }),
        ...(updates.creditGrade && { creditGrade: updates.creditGrade }),
        ...(updates.creditLimit !== undefined && { creditLimit: Number(updates.creditLimit) }),
        ...(updates.guarantorName !== undefined && { guarantorName: updates.guarantorName?.trim() || null }),
        ...(updates.guarantorPhone !== undefined && { guarantorPhone: updates.guarantorPhone?.trim() || null }),
      },
    });

    await saveDbToBlob();

    safeRevalidate("/borrowers");
    safeRevalidate(`/borrowers/${borrowerId}`);
    safeRevalidate("/loans/new");

    return { success: true };
  } catch (error: any) {
    console.error("Update borrower error:", error);
    return { success: false, error: error.message ?? "แก้ไขข้อมูลลูกหนี้ล้มเหลว" };
  }
}

export async function deleteBorrowerAction(borrowerId: string) {
  try {
    await syncDbFromBlob();

    if (!borrowerId) {
      return { success: false, error: "ไม่พบรหัสลูกหนี้" };
    }

    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
      include: {
        loans: {
          where: {
            status: { in: ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"] },
            deletedAt: null,
          },
        },
      },
    });

    if (!borrower) {
      return { success: false, error: "ไม่พบข้อมูลลูกหนี้นี้" };
    }

    // Soft delete borrower and cascade soft-delete their loans
    await prisma.$transaction(async (tx) => {
      await tx.loan.updateMany({
        where: { borrowerId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      await tx.borrower.update({
        where: { id: borrowerId },
        data: { deletedAt: new Date() },
      });
    });

    await saveDbToBlob();

    safeRevalidate("/borrowers");
    safeRevalidate("/");
    safeRevalidate("/loans/new");

    return { success: true };
  } catch (error: any) {
    console.error("Delete borrower error:", error);
    return { success: false, error: error.message ?? "ลบข้อมูลลูกหนี้ล้มเหลว" };
  }
}

