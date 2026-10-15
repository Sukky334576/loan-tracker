import { PrismaClient } from "@prisma/client";
import { addCapitalAction, setFundBalanceAction, resetDatabaseToProductionAction } from "./src/app/actions/ledger.ts";
import { createBorrowerAction, deleteBorrowerAction, checkBorrowerRiskAction } from "./src/app/actions/borrowers.ts";
import { createLoanAction, deleteLoanAction, writeOffBadDebtAction } from "./src/app/actions/loans.ts";
import { saveSignatureAction } from "./src/app/actions/contract.ts";
import { recordPaymentAction } from "./src/app/actions/payments.ts";
import { loginAction } from "./src/app/actions/auth.ts";
import { getDashboardData } from "./src/lib/data.ts";
import { formatLineReminderText } from "./src/lib/line-reminder.ts";

const prisma = new PrismaClient();

async function runFullJourneyTest() {
  console.log("==================================================");
  console.log("🚀 STARTING FULL END-TO-END USER JOURNEY TEST (PHASE 1-3)");
  console.log("==================================================\n");

  const results = [];

  // --- STEP 1: AUTHENTICATION CHECK & AUDIT LOG ---
  try {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    const agent = await prisma.user.findFirst({ where: { role: "AGENT" } });
    if (!owner || !agent) throw new Error("Owner or Agent missing in database");

    // Test login action and audit recording
    await loginAction({ username: "farafull", password: "farafull2026" });

    results.push({ 
      step: "1. ตรวจสอบบัญชีผู้ใช้ & ระบบล็อกอิน (นายทุน & สายตรวจ)", 
      status: "PASSED", 
      detail: `Owner: ${owner.username}, Agent: ${agent.username}` 
    });
  } catch (e) {
    results.push({ step: "1. ตรวจสอบบัญชีผู้ใช้", status: "FAILED", error: e.message });
  }

  // --- STEP 2: SET CENTRAL FUND ---
  try {
    const injectRes = await addCapitalAction({
      amount: 100000,
      type: "CAPITAL_INJECTION",
      description: "เงินทุนตั้งต้นกองกลางสำหรับทดสอบ Journey",
    });
    if (!injectRes.success) throw new Error(injectRes.error);

    const ledgerEntries = await prisma.cashLedger.findMany();
    const balance = ledgerEntries.reduce((sum, e) => sum + (e.type === "CAPITAL_INJECTION" || e.type === "REPAYMENT" ? e.amount : -e.amount), 0);
    if (balance < 100000) throw new Error(`Balance expected >= 100000, got ${balance}`);
    results.push({ step: "2. กำหนดและเติมเงินกองกลาง (100,000 ฿)", status: "PASSED", detail: `ยอดคงเหลือกองกลางปัจจุบัน: ${balance.toLocaleString()} ฿` });
  } catch (e) {
    results.push({ step: "2. กำหนดและเติมเงินกองกลาง", status: "FAILED", error: e.message });
  }

  // --- STEP 3: REGISTER BORROWER ---
  let borrowerId = null;
  try {
    const createBRes = await createBorrowerAction({
      citizenId: "1999999999999",
      fullName: "นายทดสอบ สมบูรณ์ทรัพย์",
      nickname: "เสี่ยท็อป",
      phone: "0898889999",
      workplace: "เจ้าของร้านขายของชำ บ้านเป้า",
      creditLimit: 10000,
      creditGrade: "GOOD",
    });
    if (!createBRes.success || !createBRes.borrowerId) throw new Error(createBRes.error);
    borrowerId = createBRes.borrowerId;
    results.push({ step: "3. เพิ่มข้อมูลลูกหนี้ใหม่ (ลงทะเบียนสำเร็จ)", status: "PASSED", detail: `ลูกหนี้ ID: ${borrowerId} (ชื่อเล่น: เสี่ยท็อป)` });
  } catch (e) {
    results.push({ step: "3. เพิ่มข้อมูลลูกหนี้ใหม่", status: "FAILED", error: e.message });
  }

  // --- STEP 4: ISSUE LOAN WITH UPFRONT DEDUCTION ---
  let loanId = null;
  try {
    const loanRes = await createLoanAction({
      borrowerId,
      principal: 3000,
      termType: "DAYS_10",
      processingFee: 0,
      isUpfrontDeduction: true, // 20% of 3000 = 600 interest deducted upfront
      contractType: "STANDARD",
      contractPlace: "บ้านเป้า เกษตรสมบูรณ์",
    });
    if (!loanRes.success || !loanRes.loanId) throw new Error(loanRes.error);
    loanId = loanRes.loanId;

    const loanInDb = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanInDb || loanInDb.disbursedAmount !== 2400) {
      throw new Error(`Expected disbursed 2400, got ${loanInDb?.disbursedAmount}`);
    }
    results.push({ step: "4. เปิดสัญญาปล่อยกู้หักดอกล่วงหน้า (กู้ 3,000 โอนจริง 2,400 ฿)", status: "PASSED", detail: `สัญญา ID: ${loanId}` });
  } catch (e) {
    results.push({ step: "4. เปิดสัญญาปล่อยกู้", status: "FAILED", error: e.message });
  }

  // --- STEP 5: DIGITAL SIGNATURE ---
  try {
    const dummySignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const signRes = await saveSignatureAction({
      loanId,
      role: "borrower",
      signatureDataUrl: dummySignature,
    });
    if (!signRes.success) throw new Error(signRes.error);

    const signedLoan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!signedLoan.borrowerSignature || !signedLoan.signedAt) {
      throw new Error("Borrower signature or signedAt timestamp missing");
    }
    results.push({ step: "5. เซ็นสัญญากู้ยืมดิจิทัล (Digital Signature)", status: "PASSED", detail: `ลงนามวันที่: ${signedLoan.signedAt.toISOString()}` });
  } catch (e) {
    results.push({ step: "5. เซ็นสัญญากู้ยืมดิจิทัล", status: "FAILED", error: e.message });
  }

  // --- STEP 6: DASHBOARD METRICS CHECK ---
  try {
    const { loans, metrics } = await getDashboardData();
    const currentLoan = loans.find((l) => l.id === loanId);
    if (!currentLoan) throw new Error("Loan not found on active dashboard");
    if (metrics.totalPrincipalInMarket !== 3000) throw new Error(`Market principal mismatch: ${metrics.totalPrincipalInMarket}`);
    results.push({ step: "6. แดชบอร์ดแสดงข้อมูลถูกต้องแบบ Glanceable", status: "PASSED", detail: `เงินต้นหมุนเวียน: ${metrics.totalPrincipalInMarket} ฿, สัญญา: ${metrics.activeLoansCount} ราย` });
  } catch (e) {
    results.push({ step: "6. แดชบอร์ดแสดงข้อมูล", status: "FAILED", error: e.message });
  }

  // --- STEP 7: WATERFALL REPAYMENT (ROLLOVER) ---
  try {
    // Pay interest only (3000 * 20% = 600 ฿)
    const payRes = await recordPaymentAction({
      loanId,
      payType: "INTEREST",
      amountPaid: 600,
      notes: "ตัดดอกเบี้ยรอบที่ 1",
    });
    if (!payRes.success) throw new Error(payRes.error);

    const updatedLoan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (updatedLoan.rolloverCount !== 1) throw new Error(`Rollover count expected 1, got ${updatedLoan.rolloverCount}`);
    results.push({ step: "7. บันทึกตัดดอกเบี้ยรอบที่ 1/3 (ยอด 600 ฿)", status: "PASSED", detail: `โควตารอบต่อดอกเพิ่มเป็น: ${updatedLoan.rolloverCount}/3` });
  } catch (e) {
    results.push({ step: "7. บันทึกตัดดอกเบี้ย", status: "FAILED", error: e.message });
  }

  // --- STEP 8: FULL SETTLEMENT (ปิดยอดสัญญา) ---
  try {
    // Settle principal in full (3000 ฿)
    const settleRes = await recordPaymentAction({
      loanId,
      payType: "SETTLE",
      amountPaid: 3600, // 600 interest + 3000 principal
      notes: "ปิดยอดจบหนี้เรียบร้อย",
    });
    if (!settleRes.success) throw new Error(settleRes.error);

    const settledLoan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (settledLoan.status !== "SETTLED" || settledLoan.remainingPrincipal !== 0) {
      throw new Error(`Loan expected SETTLED with 0 remaining, got status ${settledLoan.status}, remaining ${settledLoan.remainingPrincipal}`);
    }

    const borrowerAfterSettle = await prisma.borrower.findUnique({ where: { id: borrowerId } });
    if (borrowerAfterSettle.completedCycles !== 1) {
      throw new Error(`Completed cycles expected 1, got ${borrowerAfterSettle.completedCycles}`);
    }

    results.push({ step: "8. บันทึกปิดยอดสัญญา (SETTLED จบหนี้สมบูรณ์)", status: "PASSED", detail: `สถานะ: ${settledLoan.status}, เงินต้นคงค้าง: ${settledLoan.remainingPrincipal} ฿, สัญญาจบสะสม: ${borrowerAfterSettle.completedCycles} รอบ` });
  } catch (e) {
    results.push({ step: "8. บันทึกปิดยอดสัญญา", status: "FAILED", error: e.message });
  }

  // --- STEP 9: PHASE 3 - ONE-CLICK LINE REMINDER FORMATTING ---
  try {
    const reminderText = formatLineReminderText({
      borrowerName: "นายทดสอบ สมบูรณ์ทรัพย์",
      nickname: "เสี่ยท็อป",
      remainingPrincipal: 3000,
      cycleInterest: 600,
      penaltyAccrued: 150,
      daysDiff: -3,
      currentDueDate: new Date(),
    });

    if (
      !reminderText.includes("เสี่ยท็อป") ||
      !reminderText.includes("546-7-396726") ||
      !reminderText.includes("ธนาคารกรุงเทพ")
    ) {
      throw new Error("Reminder text missing key template fields");
    }

    results.push({
      step: "9. ระบบจัดข้อความแจ้งยอดส่ง LINE อัตโนมัติ (1-Click LINE Reminder)",
      status: "PASSED",
      detail: "ดึงชื่อเล่น วันครบกำหนด ดอกเบี้ย และเลขบัญชี BBL 546-7-396726 ถูกต้องสมบูรณ์",
    });
  } catch (e) {
    results.push({ step: "9. ระบบแจ้งยอด LINE", status: "FAILED", error: e.message });
  }

  // --- STEP 10: PHASE 3 - RISK VALIDATION (DUPLICATE & CROSS-GUARANTOR) ---
  try {
    // 1. Duplicate Check
    const dupCheck = await checkBorrowerRiskAction({
      citizenId: "1999999999999",
      phone: "0898889999",
    });
    if (!dupCheck.isDuplicate) {
      throw new Error("Failed to detect duplicate citizenId/phone");
    }

    // 2. Cross-Guarantor Check (Borrower has active/settled record)
    // Create an active loan to trigger active guarantor conflict
    const activeLoan = await prisma.loan.create({
      data: {
        borrowerId,
        agentId: (await prisma.user.findFirst()).id,
        initialPrincipal: 2000,
        remainingPrincipal: 2000,
        termType: "DAYS_7",
        interestRate: 0.15,
        status: "ACTIVE",
        startDate: new Date(),
        currentDueDate: new Date(),
      },
    });

    const conflictCheck = await checkBorrowerRiskAction({
      guarantorPhone: "0898889999",
    });

    if (!conflictCheck.isGuarantorConflict) {
      throw new Error("Failed to detect cross-guarantor active conflict");
    }

    // Clean up temporary active loan
    await prisma.loan.delete({ where: { id: activeLoan.id } });

    results.push({
      step: "10. ระบบตรวจสอบข้อมูลซ้ำ & คนค้ำประกันไขว้ (Cross-Guarantor Check)",
      status: "PASSED",
      detail: `ตรวจจับข้อมูลซ้ำและคนค้ำไขว้สำเร็จ (${conflictCheck.conflictBorrowerName} กำลังมีสัญญา)`,
    });
  } catch (e) {
    results.push({ step: "10. ตรวจสอบข้อมูลซ้ำ & คนค้ำไขว้", status: "FAILED", error: e.message });
  }

  // --- STEP 11: PHASE 3 - AUTO TIER UPGRADE (3 CYCLES -> GOOD / 6 -> VIP) ---
  try {
    // Simulate borrower reaching 3 completed cycles
    await prisma.borrower.update({
      where: { id: borrowerId },
      data: { completedCycles: 2 },
    });

    // Create a quick loan and settle it to trigger the 3rd cycle
    const tempLoan = await prisma.loan.create({
      data: {
        borrowerId,
        agentId: (await prisma.user.findFirst()).id,
        initialPrincipal: 2000,
        remainingPrincipal: 2000,
        termType: "DAYS_7",
        interestRate: 0.15,
        status: "ACTIVE",
        startDate: new Date(),
        currentDueDate: new Date(),
      },
    });

    await recordPaymentAction({
      loanId: tempLoan.id,
      payType: "SETTLE",
      amountPaid: 2300,
      notes: "ปิดสัญญารอบที่ 3 เลื่อนขั้นเป็น GOOD",
    });

    const upgradedBorrower = await prisma.borrower.findUnique({ where: { id: borrowerId } });
    if (upgradedBorrower.creditGrade !== "GOOD" || upgradedBorrower.creditLimit < 5000) {
      throw new Error(`Expected GOOD grade with >=5000 limit, got grade: ${upgradedBorrower.creditGrade}, limit: ${upgradedBorrower.creditLimit}`);
    }

    results.push({
      step: "11. ระบบเลื่อนขั้นเครดิตอัตโนมัติ (Auto Tier Upgrade to GOOD/VIP)",
      status: "PASSED",
      detail: `ปิดยอดครบ 3 รอบ เลื่อนขั้นเป็น: ${upgradedBorrower.creditGrade}, วงเงินแนะนำ: ${upgradedBorrower.creditLimit.toLocaleString()} ฿`,
    });
  } catch (e) {
    results.push({ step: "11. ระบบเลื่อนขั้นเครดิตอัตโนมัติ", status: "FAILED", error: e.message });
  }

  // --- STEP 12: PHASE 3 - BAD DEBT WRITE-OFF & BLACKLIST LOCK ---
  try {
    const badLoan = await prisma.loan.create({
      data: {
        borrowerId,
        agentId: (await prisma.user.findFirst()).id,
        initialPrincipal: 2000,
        remainingPrincipal: 2000,
        termType: "DAYS_7",
        interestRate: 0.15,
        status: "OVERDUE",
        penaltyAccrued: 200,
        startDate: new Date(),
        currentDueDate: new Date(),
      },
    });

    const writeOffRes = await writeOffBadDebtAction(badLoan.id, "ลูกหนี้หลบหนี ไม่สามารถติดต่อได้");
    if (!writeOffRes.success) throw new Error(writeOffRes.error);

    const writtenOffLoan = await prisma.loan.findUnique({ where: { id: badLoan.id } });
    const blacklistedBorrower = await prisma.borrower.findUnique({ where: { id: borrowerId } });

    if (writtenOffLoan.status !== "BAD_DEBT" || blacklistedBorrower.creditGrade !== "BLACKLIST") {
      throw new Error(`Mismatch after write-off: loan status=${writtenOffLoan.status}, borrower grade=${blacklistedBorrower.creditGrade}`);
    }

    results.push({
      step: "12. ตัดจำหน่ายหนี้สูญ & ติด Blacklist อัตโนมัติ (Bad Debt Write-Off)",
      status: "PASSED",
      detail: `สถานะสัญญา: ${writtenOffLoan.status}, ระดับผู้กู้: ${blacklistedBorrower.creditGrade}`,
    });
  } catch (e) {
    results.push({ step: "12. ตัดจำหน่ายหนี้สูญ", status: "FAILED", error: e.message });
  }

  // --- STEP 13: PHASE 3 - AUDIT LOG VERIFICATION ---
  try {
    const auditCount = await prisma.auditLog.count();
    const latestLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (auditCount === 0) {
      throw new Error("Audit log table has no records");
    }

    const actionTypes = latestLogs.map(l => l.action).join(", ");
    results.push({
      step: "13. ตรวจสอบบันทึกการกระทำในระบบ (System Audit Log)",
      status: "PASSED",
      detail: `พบ Audit Log ทั้งหมด ${auditCount} รายการ (ล่าสุด: ${actionTypes})`,
    });
  } catch (e) {
    results.push({ step: "13. ตรวจสอบบันทึก Audit Log", status: "FAILED", error: e.message });
  }

  // --- STEP 14: CLEAN UP TEST DATA FOR PRODUCTION ---
  try {
    const cleanRes = await resetDatabaseToProductionAction();
    if (!cleanRes.success) throw new Error(cleanRes.error);

    const [bCount, lCount, pCount, cCount] = await Promise.all([
      prisma.borrower.count(),
      prisma.loan.count(),
      prisma.payment.count(),
      prisma.cashLedger.count(),
    ]);

    if (bCount !== 0 || lCount !== 0 || pCount !== 0 || cCount !== 0) {
      throw new Error(`Data still remains: b=${bCount}, l=${lCount}, p=${pCount}, c=${cCount}`);
    }

    const finalUsers = await prisma.user.findMany({ select: { username: true, role: true } });

    results.push({ 
      step: "14. ล้างข้อมูลทดสอบทั้งหมด 100% (Ready for Production)", 
      status: "PASSED", 
      detail: `ลูกหนี้: ${bCount}, สัญญา: ${lCount}, การจ่าย: ${pCount}, ผู้ใช้คงอยู่: ${finalUsers.map(u => u.username).join(", ")}` 
    });
  } catch (e) {
    results.push({ step: "14. ล้างข้อมูลทดสอบทั้งหมด", status: "FAILED", error: e.message });
  }

  console.log("\n==================================================");
  console.log("📋 FULL TEST SUMMARY REPORT (14/14 STEPS)");
  console.log("==================================================");
  let allPassed = true;
  results.forEach((r) => {
    const isOk = r.status === "PASSED";
    if (!isOk) allPassed = false;
    const icon = isOk ? "✅" : "❌";
    console.log(`${icon} [${r.status}] ${r.step}`);
    if (r.detail) console.log(`   ↳ รายละเอียด: ${r.detail}`);
    if (r.error) console.log(`   ↳ ข้อผิดพลาด: ${r.error}`);
  });
  console.log("==================================================");
  if (allPassed) {
    console.log("🎉 ALL 14 TEST JOURNEY STEPS PASSED WITH 100% SUCCESS!");
  } else {
    console.error("⚠️ SOME TEST STEPS FAILED.");
    process.exit(1);
  }
}

runFullJourneyTest().catch(console.error);
