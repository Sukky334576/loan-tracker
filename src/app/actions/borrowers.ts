"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

export async function createBorrowerAction(input: CreateBorrowerInput) {
  try {
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

    revalidatePath("/borrowers");
    revalidatePath("/loans/new");

    return { success: true, borrowerId: borrower.id };
  } catch (error: any) {
    console.error("Create borrower error:", error);
    return { success: false, error: error.message ?? "บันทึกข้อมูลลูกหนี้ล้มเหลว" };
  }
}
