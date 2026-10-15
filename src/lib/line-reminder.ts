export interface LineReminderData {
  borrowerName: string;
  nickname?: string | null;
  remainingPrincipal: number;
  cycleInterest: number;
  penaltyAccrued?: number;
  accruedInterest?: number;
  currentDueDate: string | Date;
  daysDiff: number;
  status: string;
}

export function formatLineReminderText(data: LineReminderData): string {
  const {
    borrowerName,
    nickname,
    remainingPrincipal,
    cycleInterest,
    penaltyAccrued = 0,
    accruedInterest = 0,
    currentDueDate,
    daysDiff,
    status,
  } = data;

  const dueDate = new Date(currentDueDate);
  const dueDateFormatted = dueDate.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let statusText = "กำลังกู้ (ปกติ)";
  if (status === "OVERDUE" || daysDiff < 0) {
    statusText = `⚠️ เกินกำหนดชำระ ${Math.abs(daysDiff)} วัน`;
  } else if (daysDiff === 0) {
    statusText = `⏰ ครบกำหนดชำระวันนี้!`;
  } else {
    statusText = `⏳ กำหนดชำระในอีก ${daysDiff} วัน`;
  }

  const totalDueForRollover = penaltyAccrued + accruedInterest + cycleInterest;
  const totalSettlement = totalDueForRollover + remainingPrincipal;

  const nameWithNickname = nickname
    ? `${borrowerName} (${nickname})`
    : borrowerName;

  return (
    `📢 แจ้งเตือนยอดชำระเงินกู้ (LT LoanTracker)\n` +
    `👤 ลูกหนี้: ${nameWithNickname}\n` +
    `📌 สถานะสัญญา: ${statusText}\n` +
    `📅 วันครบกำหนด: ${dueDateFormatted}\n` +
    `-------------------------\n` +
    `💰 เงินต้นคงค้าง: ${remainingPrincipal.toLocaleString()} บาท\n` +
    `📈 ดอกเบี้ยรอบนี้: ${cycleInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n` +
    (accruedInterest > 0
      ? `⏳ ดอกเบี้ยค้างยกยอด: ${accruedInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n`
      : "") +
    (penaltyAccrued > 0
      ? `⚠️ ค่าปรับล่าช้าสะสม: ${penaltyAccrued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n`
      : "") +
    `-------------------------\n` +
    `👉 ยอดตัดดอกรอบนี้: ${totalDueForRollover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n` +
    `🏁 ยอดปิดสัญญาทั้งหมด: ${totalSettlement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n` +
    `-------------------------\n` +
    `🏦 บัญชีรับโอน: ธนาคารกรุงเทพ (BBL)\n` +
    `🔢 เลขที่บัญชี: 546-7-396726\n` +
    `👤 ชื่อบัญชี: น.ส.ฟิลิปดา ฤือปัญญา\n` +
    `-------------------------\n` +
    `*โอนแล้วรบกวนส่งสลิปยืนยันเพื่อตัดยอดในระบบ ขอบคุณครับ 🙏*`
  );
}
