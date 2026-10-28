/**
 * Thermal Printer & ESC/POS Mini-Slip Formatting Utility
 * Designed for 58mm (32 chars/line) and 80mm (48 chars/line) Bluetooth/portable printers.
 */

export interface ThermalReceiptData {
  receiptNo: string;
  paidAt: string;
  borrowerName: string;
  amountPaid: number;
  penaltyPaid: number;
  interestPaid: number;
  principalCut: number;
  remainingPrincipal: number;
  isSettlement: boolean;
  payType: "INTEREST" | "PRINCIPAL_CUT" | "SETTLE";
  nextDueDateStr?: string;
  collectorName?: string;
  bankAccount?: string;
}

export interface ThermalLoanData {
  loanId: string;
  contractPlace?: string;
  contractDate: string;
  borrowerName: string;
  borrowerCitizenId: string;
  borrowerPhone: string;
  lenderName: string;
  principal: number;
  termType: string;
  interestRate: number;
  isUpfrontDeduction: boolean;
  upfrontDeductionAmount: number;
  disbursedAmount: number;
  currentDueDate: string;
  dailyPenaltyRate: number;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
  signedAt?: string | null;
}

/**
 * Calculates visual display width for monospaced / ESC-POS thermal printer output.
 * In Thai language, combining vowels (ิ ี ึ ื ุ ู ั ํ ็) and tone marks (่ ้ ๊ ๋ ์)
 * occupy 0 character cells because they stack vertically onto the base consonant cell.
 */
export function getVisualWidth(text: string): number {
  if (!text) return 0;
  return text.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, "").length;
}

function padLine(left: string, right: string, width: number): string {
  const visualLeft = getVisualWidth(left);
  const visualRight = getVisualWidth(right);
  const spaceNeeded = width - (visualLeft + visualRight);
  if (spaceNeeded <= 0) return `${left} ${right}`;
  return left + " ".repeat(spaceNeeded) + right;
}

function centerLine(text: string, width: number): string {
  const visualLen = getVisualWidth(text);
  if (visualLen >= width) return text;
  const leftPad = Math.floor((width - visualLen) / 2);
  const rightPad = width - visualLen - leftPad;
  return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}

/**
 * Generates raw formatted ESC/POS-ready text for repayment receipts.
 */
export function formatRepaymentThermalText(
  data: ThermalReceiptData,
  width: 58 | 80 = 58
): string {
  const cols = width === 58 ? 32 : 48;
  const sep = "-".repeat(cols);
  const dsep = "=".repeat(cols);

  const typeLabel = data.isSettlement
    ? "ปิดยอดสัญญาบริบูรณ์"
    : data.payType === "PRINCIPAL_CUT"
    ? "ตัดดอก + โปะเงินต้น"
    : "ชำระดอกเบี้ยต่องวด";

  const lines: string[] = [
    centerLine("LT LOAN TRACKER", cols),
    centerLine("ใบเสร็จรับเงินดิจิทัล (MINI SLIP)", cols),
    centerLine("สาขา เกษตรสมบูรณ์ ชัยภูมิ", cols),
    dsep,
    padLine("เลขที่:", data.receiptNo, cols),
    padLine("วันที่:", data.paidAt, cols),
    padLine("ผู้รับเงิน:", data.collectorName || "สายตรวจ LT", cols),
    sep,
    padLine("ผู้กู้:", data.borrowerName, cols),
    padLine("ประเภท:", typeLabel, cols),
    sep,
  ];

  if (data.penaltyPaid > 0) {
    lines.push(padLine("ค่าปรับล่าช้า:", `+${data.penaltyPaid.toLocaleString()} B`, cols));
  }
  lines.push(padLine("ดอกเบี้ยชำระ:", `${data.interestPaid.toLocaleString()} B`, cols));
  if (data.principalCut > 0) {
    lines.push(padLine("ตัดลดเงินต้น:", `-${data.principalCut.toLocaleString()} B`, cols));
  }

  lines.push(sep);
  lines.push(padLine("ยอดรับเงินรวม:", `${data.amountPaid.toLocaleString()} THB`, cols));
  lines.push(dsep);

  const remLabel = data.isSettlement ? "0 THB (จบสัญญา)" : `${data.remainingPrincipal.toLocaleString()} THB`;
  lines.push(padLine("เงินต้นคงค้าง:", remLabel, cols));

  if (!data.isSettlement && data.nextDueDateStr) {
    lines.push(padLine("นัดชำระงวดถัดไป:", data.nextDueDateStr, cols));
  }

  lines.push(sep);
  lines.push(centerLine("บัญชีรับโอน: BBL 546-7-396726", cols));
  lines.push(centerLine("น.ส.ฟิลิปดา ภาปัญญา", cols));
  lines.push(sep);
  lines.push(centerLine("*** ขอบคุณที่ชำระตรงเวลา ***", cols));
  lines.push(centerLine("ESC/POS READY v1.0", cols));
  lines.push("\n\n");

  return lines.join("\n");
}

/**
 * Generates raw formatted ESC/POS-ready text for mini loan contracts.
 */
export function formatLoanContractThermalText(
  data: ThermalLoanData,
  width: 58 | 80 = 58
): string {
  const cols = width === 58 ? 32 : 48;
  const sep = "-".repeat(cols);
  const dsep = "=".repeat(cols);

  const lines: string[] = [
    centerLine("LT LOAN TRACKER", cols),
    centerLine("สัญญากู้ยืมเงิน (ฉบับย่อ/มินิสลิป)", cols),
    centerLine("สาขา เกษตรสมบูรณ์ ชัยภูมิ", cols),
    dsep,
    padLine("เลขที่สัญญา:", data.loanId.slice(-8).toUpperCase(), cols),
    padLine("วันที่ทำสัญญา:", data.contractDate, cols),
    padLine("สถานที่ทำ:", data.contractPlace || "บ้านเป้า", cols),
    sep,
    centerLine("[ ข้อมูลคู่สัญญา ]", cols),
    padLine("ผู้ให้กู้:", data.lenderName, cols),
    padLine("ผู้กู้:", data.borrowerName, cols),
    padLine("บัตรประชาชน:", data.borrowerCitizenId, cols),
    padLine("เบอร์โทร:", data.borrowerPhone, cols),
  ];

  if (data.guarantorName) {
    lines.push(padLine("ผู้รับรอง/ค้ำ:", data.guarantorName, cols));
    if (data.guarantorPhone) {
      lines.push(padLine("โทรผู้ค้ำ:", data.guarantorPhone, cols));
    }
  }

  lines.push(sep);
  lines.push(centerLine("[ รายละเอียดเงินกู้ ]", cols));
  lines.push(padLine("ยอดกู้ยืม:", `${data.principal.toLocaleString()} THB`, cols));
  lines.push(padLine("รอบระยะเวลา:", data.termType === "DAYS_7" ? "ทุก 7 วัน (15%)" : "ทุก 10 วัน (20%)", cols));

  if (data.isUpfrontDeduction) {
    lines.push(padLine("หักดอกล่วงหน้า:", `-${data.upfrontDeductionAmount.toLocaleString()} B`, cols));
    lines.push(padLine("ยอดโอนจริง:", `${data.disbursedAmount.toLocaleString()} THB`, cols));
  }

  lines.push(padLine("กำหนดชำระคืน:", data.currentDueDate, cols));
  lines.push(padLine("เบี้ยปรับล่าช้า:", `${data.dailyPenaltyRate} B/วัน`, cols));
  lines.push(sep);

  lines.push(centerLine("ผู้กู้ได้รับเงินกู้ครบถ้วนแล้ว", cols));
  lines.push(centerLine("ตกลงชำระเงินต้นและดอกเบี้ยตามกำหนด", cols));
  lines.push(centerLine("หากผิดนัดยินยอมชดใช้เบี้ยปรับตามสัญญา", cols));
  lines.push(sep);

  if (data.signedAt) {
    lines.push(padLine("สถานะลงนาม:", "ลงลายมือชื่อดิจิทัลแล้ว", cols));
    lines.push(padLine("เวลาลงนาม:", data.signedAt, cols));
  } else {
    lines.push(padLine("สถานะลงนาม:", "รอลงลายมือชื่อ", cols));
  }

  lines.push(dsep);
  lines.push(centerLine("สัญญาอิเล็กทรอนิกส์ตาม พ.ร.บ.ธุรกรรมฯ", cols));
  lines.push(centerLine("ESC/POS READY v1.0", cols));
  lines.push("\n\n");

  return lines.join("\n");
}

/**
 * Triggers browser print with thermal class for exact 58mm or 80mm roll width.
 */
export function triggerThermalPrint(width: 58 | 80 = 58): void {
  if (typeof window === "undefined") return;

  const className = width === 58 ? "print-thermal-58" : "print-thermal-80";
  document.body.classList.remove("print-thermal-58", "print-thermal-80");
  document.body.classList.add(className);

  const cleanup = () => {
    document.body.classList.remove("print-thermal-58", "print-thermal-80");
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  // Trigger print dialog
  setTimeout(() => {
    window.print();
  }, 100);
}
