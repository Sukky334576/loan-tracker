"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { syncDbFromBlob, saveDbToBlob } from "@/lib/blob-sync";
import { getSession } from "@/app/actions/auth";

export interface CreateBorrowerInput {
  citizenId: string;
  fullName: string;
  nickname?: string;
  phone: string;
  workplace?: string;
  addressOnCard?: string;
  facebookUrl?: string;
  backupPhone?: string;
  creditGrade?: "NEW" | "GOOD" | "VIP" | "WATCHLIST" | "BLACKLIST";
  creditLimit?: number;
  guarantorName?: string;
  guarantorPhone?: string;
  idCardPhoto?: string;
  storeOrHomePhoto?: string;
}

export interface UpdateBorrowerInput {
  borrowerId: string;
  fullName?: string;
  nickname?: string;
  phone?: string;
  workplace?: string;
  addressOnCard?: string;
  facebookUrl?: string;
  backupPhone?: string;
  creditGrade?: "NEW" | "GOOD" | "VIP" | "WATCHLIST" | "BLACKLIST";
  creditLimit?: number;
  guarantorName?: string;
  guarantorPhone?: string;
  idCardPhoto?: string;
  storeOrHomePhoto?: string;
}

/**
 * Real-time check for duplicate borrower and cross-guarantor conflicts.
 */
export async function checkBorrowerRiskAction(params: {
  citizenId?: string;
  phone?: string;
  guarantorPhone?: string;
  backupPhone?: string;
  excludeBorrowerId?: string;
}) {
  try {
    await syncDbFromBlob(false);

    const { citizenId, phone, guarantorPhone, backupPhone, excludeBorrowerId } = params;

    let duplicateBorrower: {
      id: string;
      fullName: string;
      citizenId: string;
      phone: string;
      reason: string;
    } | null = null;

    let crossGuarantorAlert: {
      borrowerId: string;
      borrowerName: string;
      phone: string;
      statusLabel: string;
      remainingTotal: number;
      warningMessage: string;
    } | null = null;

    // 1. Check duplicate borrower by citizenId or phone
    const cleanCitizenId = citizenId?.replace(/\D/g, "");
    const cleanPhone = phone?.replace(/\D/g, "");

    if (cleanCitizenId && cleanCitizenId.length >= 10) {
      const match = await prisma.borrower.findFirst({
        where: {
          citizenId: cleanCitizenId,
          deletedAt: null,
          ...(excludeBorrowerId ? { id: { not: excludeBorrowerId } } : {}),
        },
      });
      if (match) {
        duplicateBorrower = {
          id: match.id,
          fullName: match.fullName,
          citizenId: match.citizenId,
          phone: match.phone,
          reason: "เลขบัตรประชาชนตรงกับลูกหนี้ที่มีอยู่ในระบบแล้ว",
        };
      }
    }

    if (!duplicateBorrower && cleanPhone && cleanPhone.length >= 9) {
      const match = await prisma.borrower.findFirst({
        where: {
          phone: { contains: cleanPhone },
          deletedAt: null,
          ...(excludeBorrowerId ? { id: { not: excludeBorrowerId } } : {}),
        },
      });
      if (match) {
        duplicateBorrower = {
          id: match.id,
          fullName: match.fullName,
          citizenId: match.citizenId,
          phone: match.phone,
          reason: "เบอร์โทรศัพท์ตรงกับลูกหนี้ที่มีอยู่ในระบบแล้ว",
        };
      }
    }

    // 2. Cross-Guarantor check: compare guarantorPhone and backupPhone against active borrowers
    const targetPhonesToCheck = [guarantorPhone, backupPhone]
      .filter(Boolean)
      .map((p) => p!.replace(/\D/g, ""))
      .filter((p) => p.length >= 9);

    if (targetPhonesToCheck.length > 0) {
      const matchedBorrower = await prisma.borrower.findFirst({
        where: {
          phone: { in: targetPhonesToCheck },
          deletedAt: null,
          ...(excludeBorrowerId ? { id: { not: excludeBorrowerId } } : {}),
          loans: {
            some: {
              status: { in: ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"] },
              deletedAt: null,
            },
          },
        },
        include: {
          loans: {
            where: {
              status: { in: ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"] },
              deletedAt: null,
            },
          },
        },
      });

      if (matchedBorrower) {
        const hasOverdue = matchedBorrower.loans.some((l) => l.status === "OVERDUE");
        const statusLabel = hasOverdue ? "ค้างชำระ (Overdue)" : "กำลังกู้ (Active)";
        const remainingTotal = matchedBorrower.loans.reduce(
          (sum, l) => sum + l.remainingPrincipal,
          0
        );

        crossGuarantorAlert = {
          borrowerId: matchedBorrower.id,
          borrowerName: matchedBorrower.fullName,
          phone: matchedBorrower.phone,
          statusLabel,
          remainingTotal,
          warningMessage: `⚠️ คำเตือน: เบอร์ผู้ค้ำประกันนี้ตรงกับลูกหนี้ในระบบ [${matchedBorrower.fullName}] ซึ่งมีสถานะ [${statusLabel}] ยอดหนี้ค้าง ${remainingTotal.toLocaleString()} ฿`,
        };
      }
    }

    return {
      success: true,
      duplicateBorrower,
      crossGuarantorAlert,
      isDuplicate: Boolean(duplicateBorrower),
      isGuarantorConflict: Boolean(crossGuarantorAlert),
      conflictBorrowerName: crossGuarantorAlert?.borrowerName,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createBorrowerAction(input: CreateBorrowerInput) {
  try {
    await syncDbFromBlob(true);
    const session = await getSession();

    const {
      citizenId,
      fullName,
      nickname,
      phone,
      workplace,
      addressOnCard,
      facebookUrl,
      backupPhone,
      creditGrade = "NEW",
      creditLimit = 2000,
      guarantorName,
      guarantorPhone,
      idCardPhoto,
      storeOrHomePhoto,
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
        nickname: nickname?.trim() || null,
        phone,
        workplace,
        addressOnCard,
        facebookUrl,
        backupPhone,
        creditGrade: creditGrade as any,
        creditLimit: Number(creditLimit) || 2000,
        guarantorName,
        guarantorPhone,
        idCardPhoto: idCardPhoto || null,
        storeOrHomePhoto: storeOrHomePhoto || null,
        agentId: session?.id ?? agent.id,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.id ?? agent.id,
        action: "BORROWER_CREATE",
        targetId: borrower.id,
        details: JSON.stringify({
          fullName: borrower.fullName,
          phone: borrower.phone,
          creditGrade: borrower.creditGrade,
          creditLimit: borrower.creditLimit,
          createdBy: session?.username || "agent1",
        }),
      },
    }).catch(() => {});

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
    await syncDbFromBlob(true);
    const session = await getSession();

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

    if (session?.role === "AGENT") {
      const isTryingToChangeGrade = updates.creditGrade !== undefined && updates.creditGrade !== borrower.creditGrade;
      const isTryingToChangeLimit = updates.creditLimit !== undefined && Number(updates.creditLimit) !== borrower.creditLimit;
      if (isTryingToChangeGrade || isTryingToChangeLimit) {
        return {
          success: false,
          error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการปรับเปลี่ยนระดับเครดิตหรือเพดานวงเงินกู้",
        };
      }
    }

    const updated = await prisma.borrower.update({
      where: { id: borrowerId },
      data: {
        ...(updates.fullName && { fullName: updates.fullName.trim() }),
        ...(updates.nickname !== undefined && { nickname: updates.nickname?.trim() || null }),
        ...(updates.phone && { phone: updates.phone.trim() }),
        ...(updates.workplace !== undefined && { workplace: updates.workplace?.trim() || null }),
        ...(updates.addressOnCard !== undefined && { addressOnCard: updates.addressOnCard?.trim() || null }),
        ...(updates.facebookUrl !== undefined && { facebookUrl: updates.facebookUrl?.trim() || null }),
        ...(updates.backupPhone !== undefined && { backupPhone: updates.backupPhone?.trim() || null }),
        ...(updates.creditGrade && { creditGrade: updates.creditGrade as any }),
        ...(updates.creditLimit !== undefined && { creditLimit: Number(updates.creditLimit) }),
        ...(updates.guarantorName !== undefined && { guarantorName: updates.guarantorName?.trim() || null }),
        ...(updates.guarantorPhone !== undefined && { guarantorPhone: updates.guarantorPhone?.trim() || null }),
        ...(updates.idCardPhoto !== undefined && { idCardPhoto: updates.idCardPhoto || null }),
        ...(updates.storeOrHomePhoto !== undefined && { storeOrHomePhoto: updates.storeOrHomePhoto || null }),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.id ?? borrower.agentId,
        action: "BORROWER_UPDATE",
        targetId: borrower.id,
        details: JSON.stringify({
          updatedBy: session?.username || "USER",
          changes: updates,
        }),
      },
    }).catch(() => {});

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
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return { success: false, error: "สงวนสิทธิ์เฉพาะนายทุน (Owner) ในการลบข้อมูลลูกหนี้ออกจากระบบ" };
    }

    await syncDbFromBlob(true);

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

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session?.id ?? borrower.agentId,
          action: "BORROWER_DELETE",
          targetId: borrower.id,
          details: JSON.stringify({
            deletedBy: session?.username || "OWNER",
            borrowerName: borrower.fullName,
            citizenId: borrower.citizenId,
            phone: borrower.phone,
            creditGrade: borrower.creditGrade,
            deletedLoansCount: borrower.loans.length,
          }),
        },
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
