import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.collectionLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.cashLedger.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.borrower.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const owner = await prisma.user.create({
    data: {
      username: "owner",
      passwordHash: "owner1234", // ใน Production จะใช้ bcrypt
      name: "น.ส.ฟิลิปดา (นายทุน)",
      role: "OWNER",
    },
  });

  const agent = await prisma.user.create({
    data: {
      username: "agent1",
      passwordHash: "agent1234",
      name: "สมชาย สายตรวจหน้าร้าน",
      role: "AGENT",
    },
  });

  // 2. Create Borrowers
  const b1 = await prisma.borrower.create({
    data: {
      citizenId: "1100200300401",
      fullName: "นายเอกชัย มั่นคง",
      phone: "081-234-5678",
      workplace: "ตลาดรังสิต ล็อค B12 (ขายผลไม้)",
      facebookUrl: "https://facebook.com/ekachai.fruit",
      backupPhone: "089-111-2233 (พี่สาว)",
      addressOnCard: "99/12 ต.ประชาธิปัตย์ อ.ธัญบุรี จ.ปทุมธานี",
      creditGrade: "GOOD",
      creditLimit: 15000,
      completedCycles: 4,
      guarantorName: "นางสมศรี มั่นคง",
      guarantorPhone: "089-111-2233",
      agentId: agent.id,
    },
  });

  const b2 = await prisma.borrower.create({
    data: {
      citizenId: "1200300400502",
      fullName: "นางสาวศิริพร บุญช่วย",
      phone: "089-876-5432",
      workplace: "ร้านกาแฟชงสด ซอย 4",
      facebookUrl: "https://facebook.com/siriporn.coffee",
      backupPhone: "082-333-4455 (แม่)",
      addressOnCard: "45 หมู่ 3 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี",
      creditGrade: "NEW",
      creditLimit: 2000,
      completedCycles: 1,
      agentId: agent.id,
    },
  });

  const b3 = await prisma.borrower.create({
    data: {
      citizenId: "1300400500603",
      fullName: "นายธนกฤต ใจกล้า",
      phone: "095-111-9988",
      workplace: "วินมอเตอร์ไซค์ หน้าตลาด",
      facebookUrl: "https://facebook.com/tanakrit.win",
      backupPhone: "086-777-8899 (แฟน)",
      creditGrade: "NEW",
      creditLimit: 2000,
      completedCycles: 0,
      agentId: agent.id,
    },
  });

  // 3. Create Active Loans
  const now = new Date();
  
  // Loan 1: ถึงกำหนดวันนี้ (Due Today) - รอบ 10 วัน ดอก 20%
  const todayDue = new Date(now);
  todayDue.setHours(18, 0, 0, 0);

  const l1StartDate = new Date(now);
  l1StartDate.setDate(l1StartDate.getDate() - 10);

  const loan1 = await prisma.loan.create({
    data: {
      borrowerId: b1.id,
      agentId: agent.id,
      initialPrincipal: 10000,
      remainingPrincipal: 10000,
      termType: "DAYS_10",
      interestRate: 0.20,
      processingFee: 300,
      rolloverCount: 1, // ต่อดอกไปแล้ว 1 รอบ
      status: "ACTIVE",
      startDate: l1StartDate,
      currentDueDate: todayDue,
    },
  });

  // Loan 2: เกินกำหนด 2 วัน (Overdue) - รอบ 7 วัน ดอก 15%
  const overdueDate = new Date(now);
  overdueDate.setDate(overdueDate.getDate() - 2);

  const l2StartDate = new Date(now);
  l2StartDate.setDate(l2StartDate.getDate() - 9);

  // Daily Penalty = (2000 * 0.15) / 7 = 42.85 per day * 2 days = ~85.7
  const loan2 = await prisma.loan.create({
    data: {
      borrowerId: b2.id,
      agentId: agent.id,
      initialPrincipal: 2000,
      remainingPrincipal: 2000,
      termType: "DAYS_7",
      interestRate: 0.15,
      processingFee: 100,
      rolloverCount: 2,
      penaltyAccrued: 85.71,
      status: "OVERDUE",
      startDate: l2StartDate,
      currentDueDate: overdueDate,
    },
  });

  // Loan 3: ดอกรอบ 3/3 (รอบอันตราย ต้องปิดรอบหน้า!) - ครบกำหนดพรุ่งนี้
  const tomorrowDue = new Date(now);
  tomorrowDue.setDate(tomorrowDue.getDate() + 1);

  const l3StartDate = new Date(now);
  l3StartDate.setDate(l3StartDate.getDate() - 6);

  const loan3 = await prisma.loan.create({
    data: {
      borrowerId: b3.id,
      agentId: agent.id,
      initialPrincipal: 2000,
      remainingPrincipal: 2000,
      termType: "DAYS_7",
      interestRate: 0.15,
      processingFee: 100,
      rolloverCount: 3, // รอบ 3 แล้ว! รอบหน้าบังคับปิด
      status: "ACTIVE",
      startDate: l3StartDate,
      currentDueDate: tomorrowDue,
    },
  });

  // 4. Initial Cash Ledger Entries
  await prisma.cashLedger.create({
    data: {
      type: "CAPITAL_INJECTION",
      amount: 100000,
      description: "นายทุนเติมเงินสดเข้ากองกลางเริ่มต้น",
    },
  });

  await prisma.cashLedger.create({
    data: {
      type: "DISBURSEMENT",
      amount: 10000,
      referenceId: loan1.id,
      description: `ปล่อยกู้นายเอกชัย มั่นคง (หักค่าดำเนินการ 300 เหลือปล่อยจริง 9,700)`,
    },
  });

  await prisma.cashLedger.create({
    data: {
      type: "DISBURSEMENT",
      amount: 2000,
      referenceId: loan2.id,
      description: `ปล่อยกู้นางสาวศิริพร บุญช่วย (หักค่าดำเนินการ 100 เหลือปล่อยจริง 1,900)`,
    },
  });

  await prisma.cashLedger.create({
    data: {
      type: "DISBURSEMENT",
      amount: 2000,
      referenceId: loan3.id,
      description: `ปล่อยกู้นายธนกฤต ใจกล้า (หักค่าดำเนินการ 100 เหลือปล่อยจริง 1,900)`,
    },
  });

  // 5. Audit Log sample
  await prisma.auditLog.create({
    data: {
      userId: owner.id,
      action: "INIT_SYSTEM",
      targetId: "SYSTEM",
      details: "เริ่มต้นระบบฐานข้อมูลและลงทะเบียนผู้ใช้เริ่มต้น",
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
