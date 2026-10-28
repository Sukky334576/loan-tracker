"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  CheckCircle2, 
  Camera, 
  AlertCircle, 
  Sparkles, 
  Trash2, 
  Loader2,
  Copy,
  Check,
  Printer,
  Receipt,
  ArrowRight,
  Calendar,
  Smartphone,
  FileText
} from "lucide-react";
import { LoanCardData } from "@/components/LoanCard";
import { recordPaymentAction } from "@/app/actions/payments";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { triggerHaptic } from "@/lib/haptics";
import { formatRepaymentThermalText, triggerThermalPrint } from "@/lib/thermal-printer";
import { recordAuditLogAction } from "@/app/actions/audit";

function getIsoDateOffset(daysOffset: number = 0): string {
  const d = new Date();
  if (daysOffset !== 0) d.setDate(d.getDate() - daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface PaymentSuccessResult {
  loanId: string;
  payType: "INTEREST" | "PRINCIPAL_CUT" | "SETTLE";
  amountPaid: number;
  isSettlement: boolean;
  remainingPrincipal: number;
}

interface ReceiptDetails {
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
}

interface RepaymentDrawerProps {
  loan: LoanCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: PaymentSuccessResult) => void;
  onDeleteRequest?: (loan: LoanCardData) => void;
  userRole?: "OWNER" | "AGENT";
}

export function RepaymentDrawer({
  loan,
  isOpen,
  onClose,
  onSuccess,
  onDeleteRequest,
  userRole = "OWNER",
}: RepaymentDrawerProps) {
  const [payType, setPayType] = useState<"INTEREST" | "PRINCIPAL_CUT" | "SETTLE">("INTEREST");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipBase64, setSlipBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedEscPos, setCopiedEscPos] = useState(false);
  const [receiptViewMode, setReceiptViewMode] = useState<"STANDARD" | "THERMAL">("STANDARD");
  const [thermalWidth, setThermalWidth] = useState<58 | 80>(58);
  const [paymentDate, setPaymentDate] = useState<string>(() => getIsoDateOffset(0));

  // Lock body scroll and trigger haptic when drawer is open
  useEffect(() => {
    if (isOpen) {
      triggerHaptic("medium");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setReceipt(null);
      setErrorMessage(null);
      setSlipFile(null);
      setSlipPreview(null);
      setSlipBase64(null);
      setPaymentDate(getIsoDateOffset(0));
      setReceiptViewMode("STANDARD");
      setCopiedEscPos(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!loan) return null;

  // Waterfall Calculation
  const cycleInterest = loan.remainingPrincipal * loan.interestRate;
  const minInterestDue = loan.penaltyAccrued + loan.accruedInterest + cycleInterest;
  const fullSettlementDue = minInterestDue + loan.remainingPrincipal;

  const currentAmount =
    payType === "INTEREST"
      ? minInterestDue
      : payType === "SETTLE"
      ? fullSettlementDue
      : Number(customAmount) || minInterestDue;

  // Handle image select & compression
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
      try {
        const compressed = await compressImageToDataUrl(file, 1000, 1000, 0.7);
        setSlipBase64(compressed);
      } catch (err) {
        console.warn("Slip compression fallback to raw data URL:", err);
      }
    }
  };

  const handleConfirmPayment = async () => {
    triggerHaptic("heavy");
    setIsSubmitting(true);
    setErrorMessage(null);

    const isSettlement = payType === "SETTLE";
    const res = await recordPaymentAction({
      loanId: loan.id,
      payType,
      amountPaid: currentAmount,
      slipUrl: slipBase64 || undefined,
      paidAt: paymentDate || undefined,
      notes: isSettlement
        ? "ปิดยอดสัญญาเรียบร้อย"
        : payType === "PRINCIPAL_CUT"
        ? `ชำระดอกเบี้ยและตัดเงินต้น ${currentAmount.toLocaleString()} บาท`
        : `ตัดดอกเบี้ยรอบที่ ${loan.rolloverCount + 1}`,
    });

    setIsSubmitting(false);

    if (res.success) {
      triggerHaptic("success");
      let principalCut = 0;
      let newPrincipal = loan.remainingPrincipal;

      if (isSettlement) {
        principalCut = loan.remainingPrincipal;
        newPrincipal = 0;
      } else if (payType === "PRINCIPAL_CUT") {
        principalCut = Math.max(0, currentAmount - minInterestDue);
        newPrincipal = Math.max(0, loan.remainingPrincipal - principalCut);
      }

      const penaltyPaid = Math.min(loan.penaltyAccrued, currentAmount);
      const interestPaid = Math.max(0, Math.min(currentAmount - penaltyPaid, cycleInterest + loan.accruedInterest));

      const chosenDate = paymentDate ? new Date(`${paymentDate}T12:00:00`) : new Date();
      const receiptNo = `RC-${loan.id.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      const paidAtStr = chosenDate.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const termDays = loan.termType === "DAYS_7" ? 7 : 10;
      const nextDue = new Date(chosenDate);
      nextDue.setDate(nextDue.getDate() + termDays);
      const nextDueDateStr = nextDue.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      setReceipt({
        receiptNo,
        paidAt: paidAtStr,
        borrowerName: loan.borrowerName,
        amountPaid: currentAmount,
        penaltyPaid,
        interestPaid,
        principalCut,
        remainingPrincipal: newPrincipal,
        isSettlement,
        payType,
        nextDueDateStr,
      });

      onSuccess?.({
        loanId: loan.id,
        payType,
        amountPaid: currentAmount,
        isSettlement,
        remainingPrincipal: newPrincipal,
      });
    } else {
      triggerHaptic("error");
      setErrorMessage(res.error ?? "เกิดข้อผิดพลาดในการบันทึกยอด");
    }
  };

  const handleCopyReceipt = async () => {
    if (!receipt) return;
    triggerHaptic("light");
    const text = `🧾 ใบเสร็จรับเงินดิจิทัล LT LoanTracker\n` +
      `--------------------------------\n` +
      `เลขที่: ${receipt.receiptNo}\n` +
      `วันที่: ${receipt.paidAt}\n` +
      `ผู้กู้: ${receipt.borrowerName}\n` +
      `ประเภท: ${receipt.isSettlement ? "ปิดยอดสัญญาเต็มจำนวน" : receipt.payType === "PRINCIPAL_CUT" ? "ตัดดอกเบี้ย + โปะเงินต้น" : "ชำระดอกเบี้ยต่องวด"}\n` +
      `--------------------------------\n` +
      (receipt.penaltyPaid > 0 ? `• ค่าปรับล่าช้า: ${receipt.penaltyPaid.toLocaleString()} บาท\n` : "") +
      `• ดอกเบี้ยชำระ: ${receipt.interestPaid.toLocaleString()} บาท\n` +
      (receipt.principalCut > 0 ? `• ตัดลดเงินต้น: ${receipt.principalCut.toLocaleString()} บาท\n` : "") +
      `💰 ยอดชำระรวม: ${receipt.amountPaid.toLocaleString()} บาท\n` +
      `--------------------------------\n` +
      `💵 เงินต้นคงเหลือ: ${receipt.isSettlement ? "0 บาท (จบสัญญาเรียบร้อย ✅)" : `${receipt.remainingPrincipal.toLocaleString()} บาท`}\n` +
      (!receipt.isSettlement ? `📅 กำหนดชำระงวดถัดไป: ${receipt.nextDueDateStr}\n` : "") +
      `--------------------------------\n` +
      `ขอบคุณที่ชำระตรงเวลาครับ 🙏`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyEscPos = async () => {
    if (!receipt) return;
    triggerHaptic("light");
    const text = formatRepaymentThermalText(receipt, thermalWidth);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEscPos(true);
      setTimeout(() => setCopiedEscPos(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handlePrintStandard = () => {
    triggerHaptic("medium");
    window.print();
  };

  const handlePrintThermal = async () => {
    triggerHaptic("medium");
    if (loan && receipt) {
      await recordAuditLogAction("THERMAL_PRINT", loan.id, {
        type: "REPAYMENT_RECEIPT",
        paperWidth: `${thermalWidth}mm`,
        receiptNo: receipt.receiptNo,
        borrowerName: receipt.borrowerName,
        amountPaid: receipt.amountPaid,
      }).catch(() => {});
    }
    triggerThermalPrint(thermalWidth);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Solid Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 280,
            }}
            className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-200 bg-white p-5 shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)] max-h-[90vh] overflow-y-auto"
          >
            {/* Grab Handle for Mobile */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Receipt className="size-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {receipt ? "ออกใบเสร็จเรียบร้อย" : "บันทึกรับชำระเงิน"}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {loan.borrowerName}
                  </h3>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            {/* RECEIPT VIEW */}
            {receipt ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-4 flex flex-col gap-3.5 animate-in fade-in-50 duration-200 hide-on-thermal"
              >
                {/* Receipt Mode Switcher (Standard vs Thermal Mini-Slip) */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setReceiptViewMode("STANDARD");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      receiptViewMode === "STANDARD"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <FileText className="size-3.5" />
                    <span>ใบเสร็จมาตรฐาน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setReceiptViewMode("THERMAL");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      receiptViewMode === "THERMAL"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <Printer className="size-3.5 text-blue-600" />
                    <span>สลิปความร้อน 58/80mm</span>
                  </button>
                </div>

                {receiptViewMode === "STANDARD" ? (
                  /* Standard Color Digital Receipt */
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
                      <div>
                        <span className="text-xs font-bold text-zinc-900">ใบเสร็จรับเงินดิจิทัล</span>
                        <p className="text-[10px] font-mono text-zinc-500">เลขที่: {receipt.receiptNo}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        ชำระสำเร็จ ✅
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-zinc-600">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">วันเวลาที่รับชำระ:</span>
                        <span className="font-semibold text-zinc-800">{receipt.paidAt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">ชื่อผู้กู้:</span>
                        <span className="font-bold text-zinc-900">{receipt.borrowerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">รูปแบบการชำระ:</span>
                        <span className="font-semibold text-zinc-800">
                          {receipt.isSettlement
                            ? "ปิดยอดสัญญาเต็มจำนวน"
                            : receipt.payType === "PRINCIPAL_CUT"
                            ? "ตัดดอกเบี้ย + โปะเงินต้น"
                            : "ชำระดอกเบี้ยต่องวด (Rollover)"}
                        </span>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 text-xs space-y-1.5">
                      {receipt.penaltyPaid > 0 && (
                        <div className="flex justify-between text-rose-600 font-medium">
                          <span>ค่าปรับล่าช้า:</span>
                          <span className="font-mono font-bold">+{receipt.penaltyPaid.toLocaleString()} ฿</span>
                        </div>
                      )}
                      <div className="flex justify-between text-zinc-700">
                        <span>ดอกเบี้ยที่ชำระ:</span>
                        <span className="font-mono font-bold">{receipt.interestPaid.toLocaleString()} ฿</span>
                      </div>
                      {receipt.principalCut > 0 && (
                        <div className="flex justify-between text-emerald-700 font-bold border-t border-dashed border-zinc-200 pt-1">
                          <span>ตัดลดเงินต้น:</span>
                          <span className="font-mono">-{receipt.principalCut.toLocaleString()} ฿</span>
                        </div>
                      )}
                      <div className="flex items-baseline justify-between border-t border-zinc-200 pt-2 text-sm font-bold text-zinc-900">
                        <span>ยอดเงินรับชำระรวม:</span>
                        <span className="font-mono text-base font-extrabold text-emerald-700">
                          {receipt.amountPaid.toLocaleString()} ฿
                        </span>
                      </div>
                    </div>

                    {/* Remaining Principal & Next Due */}
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-200/50 p-2.5 text-xs">
                      <span className="text-zinc-600 font-medium">ยอดเงินต้นคงเหลือ:</span>
                      <span className="font-mono font-extrabold text-zinc-900">
                        {receipt.isSettlement ? "0 ฿ (จบสัญญาบริบูรณ์)" : `${receipt.remainingPrincipal.toLocaleString()} ฿`}
                      </span>
                    </div>

                    {!receipt.isSettlement && receipt.nextDueDateStr && (
                      <p className="mt-2 text-center text-[11px] text-zinc-500">
                        📅 นัดชำระงวดถัดไป: <strong className="text-zinc-800">{receipt.nextDueDateStr}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  /* 58mm / 80mm ESC/POS Thermal Mini-Slip Preview */
                  <div className="flex flex-col gap-2.5">
                    {/* Paper Size Selector */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-zinc-500 font-semibold flex items-center gap-1">
                        <Smartphone className="size-3.5 text-zinc-400" />
                        <span>ขนาดกระดาษเครื่องพิมพ์บลูทูธ:</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setThermalWidth(58);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            thermalWidth === 58
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          58 mm (พกพา)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setThermalWidth(80);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            thermalWidth === 80
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          80 mm (ตั้งโต๊ะ)
                        </button>
                      </div>
                    </div>

                    {/* Realistic Thermal Paper Roll Card */}
                    <div 
                      className={`mx-auto w-full bg-white border border-zinc-300 rounded-xl p-4 shadow-inner text-black font-mono text-[11px] leading-snug transition-all ${
                        thermalWidth === 58 ? "max-w-[280px]" : "max-w-[360px]"
                      }`}
                    >
                      {/* Thermal Receipt Header */}
                      <div className="text-center pb-2 border-b border-dashed border-zinc-400">
                        <p className="font-extrabold text-xs tracking-wider">LT LOAN TRACKER</p>
                        <p className="text-[10px]">ใบเสร็จรับเงินดิจิทัล (MINI SLIP)</p>
                        <p className="text-[9px] text-zinc-500">สาขา เกษตรสมบูรณ์ ชัยภูมิ</p>
                      </div>

                      {/* Metadata */}
                      <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                        <div className="flex justify-between">
                          <span>เลขที่:</span>
                          <span className="font-bold">{receipt.receiptNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>วันที่:</span>
                          <span>{receipt.paidAt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ผู้กู้:</span>
                          <span className="font-bold">{receipt.borrowerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ประเภท:</span>
                          <span>{receipt.isSettlement ? "ปิดยอดสัญญา" : receipt.payType === "PRINCIPAL_CUT" ? "ตัดดอก+โปะต้น" : "ตัดดอกเบี้ยต่องวด"}</span>
                        </div>
                      </div>

                      {/* Financials Breakdown */}
                      <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                        {receipt.penaltyPaid > 0 && (
                          <div className="flex justify-between">
                            <span>ค่าปรับล่าช้า:</span>
                            <span>+{receipt.penaltyPaid.toFixed(2)} ฿</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>ดอกเบี้ยชำระ:</span>
                          <span>{receipt.interestPaid.toFixed(2)} ฿</span>
                        </div>
                        {receipt.principalCut > 0 && (
                          <div className="flex justify-between font-bold">
                            <span>ตัดเงินต้น:</span>
                            <span>-{receipt.principalCut.toFixed(2)} ฿</span>
                          </div>
                        )}
                        <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-dotted border-zinc-400">
                          <span>ยอดรับเงินรวม:</span>
                          <span>{receipt.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                        </div>
                      </div>

                      {/* Balance & Next Due */}
                      <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>เงินต้นคงค้าง:</span>
                          <span>{receipt.isSettlement ? "0.00 ฿ (ปิดสัญญา)" : `${receipt.remainingPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿`}</span>
                        </div>
                        {!receipt.isSettlement && receipt.nextDueDateStr && (
                          <div className="flex justify-between text-[10px]">
                            <span>นัดชำระงวดถัดไป:</span>
                            <span className="font-bold">{receipt.nextDueDateStr}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Info & Bank Account */}
                      <div className="pt-2 text-center text-[10px] text-zinc-600 space-y-0.5">
                        <p>บัญชีรับโอน: ธ.กรุงเทพ (BBL)</p>
                        <p className="font-bold tracking-wider">546-7-396726</p>
                        <p className="text-[9px]">น.ส.ฟิลิปดา ภาปัญญา</p>
                        <p className="pt-1 text-[9px] font-bold">*** ขอบคุณที่ชำระตรงเวลา ***</p>
                        <p className="text-[8px] text-zinc-400">ESC/POS Thermal v1.0</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Receipt Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReceipt}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    {copiedReceipt ? (
                      <>
                        <Check className="size-4 text-emerald-600" />
                        <span>คัดลอกบิลแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        <span>ส่งบิล LINE</span>
                      </>
                    )}
                  </button>

                  {receiptViewMode === "THERMAL" ? (
                    <button
                      type="button"
                      onClick={handlePrintThermal}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-blue-300 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                    >
                      <Printer className="size-4" />
                      <span>พิมพ์สลิป ({thermalWidth}mm)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePrintStandard}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                    >
                      <Printer className="size-4" />
                      <span>พิมพ์ใบเสร็จ</span>
                    </button>
                  )}
                </div>

                {receiptViewMode === "THERMAL" && (
                  <button
                    type="button"
                    onClick={handleCopyEscPos}
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    {copiedEscPos ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span>คัดลอกข้อความ ESC/POS สำเร็จ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-zinc-500" />
                        <span>คัดลอกข้อความ ESC/POS (สำหรับแอปปริ้นเตอร์)</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span>เสร็จสิ้น / ปิดหน้าต่าง</span>
                </button>
              </motion.div>
            ) : (
              /* PAYMENT FORM VIEW */
              <div className="mt-4 flex flex-col gap-4">
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                    <AlertCircle className="size-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Mode Selector Tabs with Motion Pill */}
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
                  {(
                    [
                      { id: "INTEREST", label: "ตัดดอก" },
                      { id: "PRINCIPAL_CUT", label: "โปะต้น" },
                      { id: "SETTLE", label: "ปิดยอด" },
                    ] as const
                  ).map((tab) => {
                    const isSelected = payType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setPayType(tab.id);
                          setErrorMessage(null);
                        }}
                        className={`relative rounded-lg py-2 text-xs font-bold transition-colors select-none cursor-pointer ${
                          isSelected ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="payTypeTab"
                            transition={{ type: "spring", damping: 25, stiffness: 400 }}
                            className="absolute inset-0 rounded-lg bg-white shadow-xs"
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Waterfall Breakdown Card */}
                <div className="rounded-2xl border border-zinc-200 bg-slate-50/90 p-3.5 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-500 font-medium">ลำดับการหักเงิน (Waterfall)</span>
                    <span className="text-[11px] font-semibold text-zinc-700">
                      รอบ {loan.termType === "DAYS_7" ? "7 วัน (15%)" : "10 วัน (20%)"} (รอบที่ {loan.rolloverCount}/3)
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t border-zinc-200/80 pt-2 text-[11px]">
                    {loan.penaltyAccrued > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>1. หักค่าปรับค้างชำระ:</span>
                        <span className="font-mono tabular-nums font-bold">+{loan.penaltyAccrued.toFixed(2)} ฿</span>
                      </div>
                    )}
                    {loan.accruedInterest > 0 && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>2. หักดอกค้างรอบก่อน:</span>
                        <span className="font-mono tabular-nums font-bold">+{loan.accruedInterest.toFixed(2)} ฿</span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-700">
                      <span>3. ดอกเบี้ยรอบปัจจุบัน:</span>
                      <span className="font-mono tabular-nums font-bold">{cycleInterest.toLocaleString()} ฿</span>
                    </div>

                    {payType === "SETTLE" && (
                      <div className="flex justify-between text-emerald-700 font-semibold border-t border-dashed border-zinc-200 pt-1">
                        <span>4. เงินต้นทั้งหมด:</span>
                        <span className="font-mono tabular-nums font-bold">{loan.remainingPrincipal.toLocaleString()} ฿</span>
                      </div>
                    )}

                    <div className="mt-1 flex items-baseline justify-between border-t border-zinc-200 pt-2 text-sm font-bold text-zinc-900">
                      <span>ยอดที่ต้องชำระ:</span>
                      <span className={`font-mono text-xl tabular-nums font-extrabold ${
                        payType === "SETTLE" ? "text-emerald-700" : "text-amber-800"
                      }`}>
                        {currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom Amount for Principal Cut */}
                {payType === "PRINCIPAL_CUT" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-1"
                  >
                    <label className="text-xs font-semibold text-zinc-700">
                      ระบุยอดเงินที่รับมา (ต้องมากกว่า {minInterestDue.toLocaleString()} ฿ เพื่อตัดต้น)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={`เช่น ${(minInterestDue + 1000).toLocaleString()}`}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-base font-bold text-zinc-900 tabular-nums focus:border-zinc-500 focus:outline-none"
                    />
                  </motion.div>
                )}

                {/* Payment Date Selector (กรอกย้อนหลัง) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-zinc-500" />
                      <span>วันที่รับชำระเงินจริง</span>
                    </label>
                    {paymentDate < getIsoDateOffset(0) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                        🕒 บันทึกย้อนหลัง
                      </span>
                    )}
                  </div>

                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-xs font-bold text-zinc-900 focus:border-zinc-500 focus:outline-none"
                  />

                  {/* Quick Date Pills */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      { label: "วันนี้", days: 0 },
                      { label: "เมื่อวาน", days: 1 },
                      { label: "2 วันก่อน", days: 2 },
                      { label: "3 วันก่อน", days: 3 },
                      { label: "5 วันก่อน", days: 5 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setPaymentDate(getIsoDateOffset(item.days))}
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all active:scale-95 cursor-pointer ${
                          paymentDate === getIsoDateOffset(item.days)
                            ? "bg-zinc-900 text-white font-bold"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slip Upload Zone */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    แนบภาพสลิปโอนเงิน (BBL 546-7-396726)
                  </label>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3 hover:bg-zinc-100 transition-colors">
                    {slipPreview ? (
                      <div className="flex items-center gap-3 w-full">
                        <img
                          src={slipPreview}
                          alt="Slip Preview"
                          className="size-12 rounded-lg object-cover border border-zinc-200 shadow-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-zinc-800 truncate">
                            {slipFile?.name}
                          </p>
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <Sparkles className="size-3" />
                            แนบสลิปเรียบร้อย
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 underline">เปลี่ยน</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Camera className="size-4 text-zinc-400" />
                        <span>แตะเพื่อถ่ายรูปสลิป หรือเลือกจากอัลบั้ม</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Confirm Action Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  onClick={handleConfirmPayment}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-md transition-all select-none cursor-pointer ${
                    payType === "SETTLE" 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "bg-zinc-900 hover:bg-zinc-800"
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>กำลังบันทึกยอด...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>
                        {payType === "SETTLE" ? "ยืนยันปิดยอดสัญญา (" : "ยืนยันรับยอด "}
                        {currentAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        บาท{payType === "SETTLE" ? ")" : ""}
                      </span>
                    </>
                  )}
                </motion.button>

                {/* Delete / Cancel Option (Restricted to OWNER) */}
                {onDeleteRequest && (!userRole || userRole === "OWNER") && (
                  <div className="flex items-center justify-center border-t border-zinc-150 pt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onDeleteRequest(loan);
                      }}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-600 transition-colors py-1 px-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>ต้องการลบ/ยกเลิกสัญญานี้ทิ้ง?</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Isolated Thermal Print Section (Hidden on normal screen, shown strictly in thermal @media print) */}
          {receipt && (
            <div id="thermal-print-container" className="hidden show-on-thermal">
              <div 
                className="bg-white p-2 text-black font-mono text-[11px] leading-tight"
                style={{ width: thermalWidth === 58 ? "54mm" : "74mm", margin: "0 auto" }}
              >
                <div className="text-center pb-2 border-b border-dashed border-black">
                  <p className="font-extrabold text-xs">LT LOAN TRACKER</p>
                  <p className="text-[10px]">ใบเสร็จรับเงินดิจิทัล (MINI SLIP)</p>
                  <p className="text-[9px]">สาขา เกษตรสมบูรณ์ ชัยภูมิ</p>
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1">
                  <div className="flex justify-between">
                    <span>เลขที่:</span>
                    <span className="font-bold">{receipt.receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>วันที่:</span>
                    <span>{receipt.paidAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ผู้กู้:</span>
                    <span className="font-bold">{receipt.borrowerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ประเภท:</span>
                    <span>{receipt.isSettlement ? "ปิดยอดสัญญา" : receipt.payType === "PRINCIPAL_CUT" ? "ตัดดอก+โปะต้น" : "ตัดดอกเบี้ยต่องวด"}</span>
                  </div>
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1">
                  {receipt.penaltyPaid > 0 && (
                    <div className="flex justify-between">
                      <span>ค่าปรับล่าช้า:</span>
                      <span>+{receipt.penaltyPaid.toFixed(2)} ฿</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>ดอกเบี้ยชำระ:</span>
                    <span>{receipt.interestPaid.toFixed(2)} ฿</span>
                  </div>
                  {receipt.principalCut > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>ตัดเงินต้น:</span>
                      <span>-{receipt.principalCut.toFixed(2)} ฿</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-dotted border-black">
                    <span>ยอดรับเงินรวม:</span>
                    <span>{receipt.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                  </div>
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>เงินต้นคงค้าง:</span>
                    <span>{receipt.isSettlement ? "0.00 ฿ (ปิดสัญญา)" : `${receipt.remainingPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿`}</span>
                  </div>
                  {!receipt.isSettlement && receipt.nextDueDateStr && (
                    <div className="flex justify-between text-[10px]">
                      <span>นัดชำระงวดถัดไป:</span>
                      <span className="font-bold">{receipt.nextDueDateStr}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-center text-[10px] space-y-0.5">
                  <p>บัญชีรับโอน: ธ.กรุงเทพ (BBL)</p>
                  <p className="font-bold tracking-wider">546-7-396726</p>
                  <p className="text-[9px]">น.ส.ฟิลิปดา ภาปัญญา</p>
                  <p className="pt-1 text-[9px] font-bold">*** ขอบคุณที่ชำระตรงเวลา ***</p>
                  <p className="text-[8px] text-zinc-500">ESC/POS Thermal v1.0</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
