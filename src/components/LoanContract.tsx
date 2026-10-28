"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Printer, 
  Share2, 
  Check, 
  PenTool, 
  ArrowLeft, 
  Download, 
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Receipt,
  Smartphone,
  Copy,
  X
} from "lucide-react";
import { bahtText } from "@/lib/bahttext";
import { formatThaiDate } from "@/lib/date";
import { LenderSignature } from "@/components/LenderSignature";
import { SignaturePad } from "@/components/SignaturePad";
import { saveSignatureAction, clearSignatureAction } from "@/app/actions/contract";
import { triggerHaptic } from "@/lib/haptics";
import { formatLoanContractThermalText, triggerThermalPrint } from "@/lib/thermal-printer";
import { recordAuditLogAction } from "@/app/actions/audit";

export interface LoanContractProps {
  loan: {
    id: string;
    contractType: string;
    contractPlace: string;
    dailyPenaltyRate: number;
    initialPrincipal: number;
    remainingPrincipal: number;
    interestRate: number;
    termType: string;
    startDate: string | Date;
    currentDueDate: string | Date;
    isUpfrontDeduction: boolean;
    upfrontDeductionAmount: number;
    disbursedAmount: number;
    guarantorName?: string | null;
    guarantorCitizenId?: string | null;
    guarantorPhone?: string | null;
    borrowerSignature?: string | null;
    guarantorSignature?: string | null;
    signedAt?: string | Date | null;
    borrower: {
      fullName: string;
      citizenId: string;
      phone: string;
      addressOnCard?: string | null;
    };
  };
  isClientSignMode?: boolean; // For direct signing page
}

export function LoanContract({ loan, isClientSignMode = false }: LoanContractProps) {
  const [activeSignRole, setActiveSignRole] = useState<"borrower" | "guarantor" | null>(null);
  const [borrowerSig, setBorrowerSig] = useState<string | null>(loan.borrowerSignature ?? null);
  const [guarantorSig, setGuarantorSig] = useState<string | null>(loan.guarantorSignature ?? null);
  const [copied, setCopied] = useState(false);
  const [copiedEscPos, setCopiedEscPos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);
  const [thermalWidth, setThermalWidth] = useState<58 | 80>(58);

  const startDateObj = new Date(loan.startDate);
  const dueDateObj = new Date(loan.currentDueDate);

  const dayStr = startDateObj.getDate().toString();
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const monthStr = monthNames[startDateObj.getMonth()];
  const yearStr = (startDateObj.getFullYear() + 543).toString();

  // Due Date Short Format
  const dueDayStr = dueDateObj.getDate();
  const dueMonthStr = dueDateObj.getMonth() + 1;
  const dueYearShort = (dueDateObj.getFullYear() + 543).toString().slice(-2);
  const dueDateSummary = `${dueDayStr}/${dueMonthStr}/${dueYearShort}`;

  const isGuaranteed = loan.contractType === "GUARANTEED";
  const bahtTextPrincipal = bahtText(loan.initialPrincipal);

  // Copy Signing Link
  const handleCopyLink = async () => {
    triggerHaptic("light");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const signUrl = `${origin}/sign/${loan.id}`;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(signUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = signUrl;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handlePrint = () => {
    triggerHaptic("medium");
    window.print();
  };

  const handlePrintThermal = async () => {
    triggerHaptic("medium");
    await recordAuditLogAction("THERMAL_PRINT", loan.id, {
      type: "LOAN_CONTRACT",
      paperWidth: `${thermalWidth}mm`,
      loanId: loan.id,
      borrowerName: loan.borrower.fullName,
    }).catch(() => {});
    triggerThermalPrint(thermalWidth);
  };

  const handleCopyEscPos = async () => {
    triggerHaptic("light");
    const contractDateStr = `${dayStr} ${monthStr} ${yearStr}`;
    const text = formatLoanContractThermalText({
      loanId: loan.id,
      contractPlace: loan.contractPlace || "บ้านเป้า",
      contractDate: contractDateStr,
      borrowerName: loan.borrower.fullName,
      borrowerCitizenId: loan.borrower.citizenId,
      borrowerPhone: loan.borrower.phone,
      lenderName: "นางสาวฟิลิปดา ภาปัญญา",
      principal: loan.initialPrincipal,
      termType: loan.termType,
      interestRate: loan.interestRate,
      isUpfrontDeduction: loan.isUpfrontDeduction,
      upfrontDeductionAmount: loan.upfrontDeductionAmount,
      disbursedAmount: loan.disbursedAmount,
      currentDueDate: dueDateSummary,
      dailyPenaltyRate: loan.dailyPenaltyRate || 50,
      guarantorName: loan.guarantorName,
      guarantorPhone: loan.guarantorPhone,
      signedAt: borrowerSig ? new Date().toLocaleString("th-TH") : null,
    }, thermalWidth);

    try {
      await navigator.clipboard.writeText(text);
      setCopiedEscPos(true);
      setTimeout(() => setCopiedEscPos(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSaveSignature = async (dataUrl: string) => {
    if (!activeSignRole) return;
    triggerHaptic("heavy");
    setIsSaving(true);

    if (activeSignRole === "borrower") {
      setBorrowerSig(dataUrl);
    } else {
      setGuarantorSig(dataUrl);
    }

    await saveSignatureAction({
      loanId: loan.id,
      role: activeSignRole,
      signatureDataUrl: dataUrl,
    });

    triggerHaptic("success");
    setIsSaving(false);
    setActiveSignRole(null);
  };

  const handleClearSignature = async (role: "borrower" | "guarantor") => {
    if (!confirm(`คุณต้องการลบลายเซ็นของ${role === "borrower" ? "ผู้กู้" : "ผู้รับรอง"} เพื่อเซ็นใหม่ใช่หรือไม่?`)) {
      return;
    }
    triggerHaptic("medium");
    if (role === "borrower") setBorrowerSig(null);
    if (role === "guarantor") setGuarantorSig(null);

    await clearSignatureAction({
      loanId: loan.id,
      role,
    });
  };

  const isFullySigned = borrowerSig && (!isGuaranteed || guarantorSig);

  return (
    <div className="min-h-screen bg-zinc-100 py-4 sm:py-8 print:bg-white print:p-0">
      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="mx-auto max-w-4xl px-4 mb-4 sm:mb-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-all active:scale-95"
            >
              <ArrowLeft className="size-4" />
              <span>กลับหน้าหลัก</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900">
                สัญญากู้ยืมเงิน
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  isFullySigned
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isFullySigned ? (
                  <>
                    <ShieldCheck className="size-3 text-emerald-700" />
                    <span>เซ็นครบแล้ว</span>
                  </>
                ) : (
                  <>
                    <PenTool className="size-3 text-amber-700" />
                    <span>รอลงลายมือชื่อ</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Link to Client */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-all active:scale-95 shadow-2xs"
              title="คัดลอกลิงก์ส่ง LINE ให้ลูกค้าเซ็นบนมือถือ"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-700" />
                  <span>คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3.5 text-emerald-700" />
                  <span>ลิงก์ให้ลูกค้าเซ็น</span>
                </>
              )}
            </button>

            {/* Thermal Mini-Slip (58mm/80mm) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                setIsThermalModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="พิมพ์สลิปสัญญาฉบับย่อสำหรับเครื่องพิมพ์พกพาความร้อน (58mm/80mm)"
            >
              <Receipt className="size-3.5 text-blue-700" />
              <span>สลิปสัญญา 58/80mm</span>
            </button>

            {/* Print / Save PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>พิมพ์สัญญา (A4 / PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contract Paper A4 Container */}
      <div className="mx-auto max-w-4xl px-2 sm:px-4 hide-on-thermal">
        <div 
          className="mx-auto bg-white p-8 sm:p-14 shadow-md border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 text-zinc-900 font-serif leading-relaxed"
          style={{ minHeight: "297mm", maxWidth: "210mm" }}
        >
          {/* Header Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-normal text-black font-sans">
              สัญญากู้ยืมเงิน
            </h1>
          </div>

          {/* Place and Date */}
          <div className="flex flex-col items-end text-sm sm:text-base mb-6 text-black">
            <div className="flex items-baseline gap-2">
              <span>ทำที่</span>
              <span className="border-b border-dotted border-zinc-800 px-3 font-semibold min-w-[120px] text-center">
                {loan.contractPlace || "บ้านเป้า"}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span>สัญญาฉบับนี้ทำขึ้นเมื่อ วันที่</span>
              <span className="border-b border-dotted border-zinc-800 px-3 font-semibold text-center">
                {dayStr} {monthStr} {yearStr}
              </span>
            </div>
          </div>

          {/* Parties Section */}
          <div className="text-sm sm:text-base space-y-3 mb-6 text-black leading-loose">
            {/* Lender Info */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>ระหว่างข้าพเจ้า</span>
              <span className="font-bold border-b border-dotted border-zinc-800 px-2 min-w-[200px]">
                นางสาวฟิลิปดา ภาปัญญา
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>เลขบัตรประชาชน</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[150px]">
                1361000289511
              </span>
              <span>อยู่บ้านเลขที่</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[60px] text-center">
                222
              </span>
              <span>ตำบล/แขวง</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[100px] text-center">
                บ้านเป้า
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>อำเภอ/เขต</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[120px] text-center">
                เกษตรสมบูรณ์
              </span>
              <span>จังหวัด</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[100px] text-center">
                ชัยภูมิ
              </span>
              <span>ซึ่งต่อไปในสัญญานี้เรียกว่า</span>
              <span className="font-bold">“ผู้ให้กู้”</span>
              <span>ฝ่ายหนึ่ง</span>
            </div>

            <div className="pt-2" />

            {/* Borrower Info */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>กับข้าพเจ้า</span>
              <span className="font-bold border-b border-dotted border-zinc-800 px-2 min-w-[240px]">
                {loan.borrower.fullName}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>เลขบัตรประชาชน</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[160px]">
                {loan.borrower.citizenId}
              </span>
              <span>อยู่บ้านเลขที่ / ที่อยู่</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[200px]">
                {loan.borrower.addressOnCard || "ตามบัตรประชาชน"}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>เบอร์โทรศัพท์</span>
              <span className="font-semibold border-b border-dotted border-zinc-800 px-2 min-w-[140px]">
                {loan.borrower.phone}
              </span>
              <span>ซึ่งต่อไปในสัญญานี้เรียกว่า</span>
              <span className="font-bold">“ผู้กู้”</span>
              <span>ฝ่ายหนึ่ง</span>
            </div>
          </div>

          {/* Agreement Clauses */}
          <div className="text-sm sm:text-base space-y-4 mb-8 text-black text-justify">
            <div className="text-center font-bold font-sans my-4">
              ทั้งสองฝ่ายตกลงทำสัญญาดังต่อไปนี้
            </div>

            {/* Clause 1 */}
            <div className="pl-6 text-indent leading-relaxed">
              <span className="font-bold">๑. ผู้กู้</span> ได้ตกลงกู้ยืมเงิน จาก{" "}
              <span className="font-bold">ผู้ให้กู้</span> เป็นเงิน จำนวน{" "}
              <span className="font-bold border-b border-dotted border-zinc-800 px-2">
                {loan.initialPrincipal.toLocaleString()}
              </span>{" "}
              บาท (
              <span className="font-bold border-b border-dotted border-zinc-800 px-2">
                {bahtTextPrincipal}
              </span>
              ) โดยสัญญานี้ <span className="font-bold">ผู้กู้</span> ได้รับเงินเรียบร้อยแล้วในวันทำสัญญานี้
            </div>

            {/* Clause 2 */}
            <div className="pl-6 leading-relaxed">
              <span className="font-bold">๒. ผู้กู้</span> ตกลงว่าจะจ่ายชำระคืน พร้อมต้นและดอกเบี้ยให้กับ{" "}
              <span className="font-bold">ผู้ให้กู้</span> เป็นรายสัปดาห์ ก่อนเวลา ๑๓.๐๐ น.
              
              <div className="pl-6 mt-2">
                <span className="font-bold">๒.๑ ผู้กู้</span> ตกลงจะให้ดอกเบี้ยแก่{" "}
                <span className="font-bold">ผู้ให้กู้</span> ตามข้อตกลง และตกลงจะชำระดอกเบี้ยให้ทุกๆสัปดาห์ ก่อนเวลา ๑๓.๐๐ น.
              </div>

              <div className="pl-6 mt-2">
                <span className="font-bold">๒.๒ หาก ผู้กู้</span> ไม่ชำระเงินต้นที่กู้ ยินยอมให้{" "}
                <span className="font-bold">ผู้ให้กู้</span> ปรับวันละ{" "}
                <span className="font-bold border-b border-dotted border-zinc-800 px-3">
                  {loan.dailyPenaltyRate || 50}
                </span>{" "}
                บาท จนกว่าผู้กู้ จะนำเงินที่กู้ไปมาชำระคืน ให้แก่ <span className="font-bold">ผู้ให้กู้</span> ตามสัญญาฉบับนี้
              </div>
            </div>

            {/* Clause 3 */}
            <div className="pl-6 leading-relaxed">
              <span className="font-bold">๓. หากผู้กู้</span> ไม่ปฏิบัติตามสัญญานี้ ผู้กู้ยินยอมรับผิดชอบชดใช้ค่าเสียหายบรรดา ที่ผู้ให้กู้จะพึงได้รับจากการผิดสัญญาดังกล่าว รวมทั้งค่าใช้จ่ายทั้งปวงในการเตือนและทวงถาม เรียกร้องให้ชำระหนี้ ตลอดจนค่าฤชาธรรมเนียม ค่าใช้จ่ายในการดำเนินคดี และค่าทนายความในการดำเนินคดีบังคับให้ชำระหนี้ คืนให้แก่ผู้ให้กู้
            </div>

            {/* Final Statement */}
            <div className="pl-6 pt-3 leading-relaxed">
              เพื่อเป็นหลักฐานคู่สัญญา ทั้งสองฝ่ายได้อ่านข้อความของสัญญานี้ดีโดยตลอดแล้ว ตรงตามความประสงค์ของคู่สัญญา ทั้งสองฝ่ายจึงได้ลงลายมือไว้เพื่อเป็นหลักฐาน
            </div>
          </div>

          {/* Signature Section */}
          <div className="mt-10 grid grid-cols-2 gap-6 sm:gap-12 pt-4">
            {/* Left: Lender Signature */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                <span>ลงชื่อ</span>
                <div className="h-14 w-44 flex items-center justify-center border-b border-dotted border-zinc-700">
                  <LenderSignature className="h-12 w-auto object-contain" />
                </div>
                <span>ผู้ให้กู้</span>
              </div>
              <div className="text-sm sm:text-base text-zinc-900 mt-1">
                ( นางสาวฟิลิปดา ภาปัญญา )
              </div>
            </div>

            {/* Right: Borrower Signature */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                <span>ลงชื่อ</span>
                
                {borrowerSig ? (
                  <div className="relative h-14 w-44 flex items-center justify-center border-b border-dotted border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={borrowerSig}
                      alt="ลายเซ็นผู้กู้"
                      className="h-14 max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleClearSignature("borrower")}
                      className="print:hidden absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs hover:bg-rose-600 transition-colors cursor-pointer text-xs font-bold"
                      title="ลบลายเซ็นเพื่อเซ็นใหม่"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveSignRole("borrower")}
                    className="print:hidden h-14 w-44 flex flex-col items-center justify-center border-2 border-dashed border-amber-400 bg-amber-50/70 rounded-lg hover:bg-amber-100/80 transition-all text-amber-900 text-xs font-sans font-bold cursor-pointer group"
                  >
                    <PenTool className="size-4 text-amber-700 group-hover:scale-110 transition-transform mb-0.5" />
                    <span>แตะเพื่อเซ็นชื่อผู้กู้</span>
                  </button>
                )}

                {/* Print placeholder if empty */}
                {!borrowerSig && (
                  <div className="hidden print:block h-14 w-44 border-b border-dotted border-zinc-700" />
                )}

                <span>ผู้กู้</span>
              </div>
              <div className="text-sm sm:text-base text-zinc-900 mt-1">
                ( {loan.borrower.fullName} )
              </div>
            </div>
          </div>

          {/* Guaranteed / Proxy Section (Only if contractType === 'GUARANTEED') */}
          {isGuaranteed && (
            <div className="mt-8 flex flex-col items-center text-center pt-2">
              <div className="font-bold text-sm sm:text-base font-sans text-black mb-3">
                รับรองให้ผู้กู้
              </div>
              <div className="flex items-center gap-1.5 mb-1 text-sm sm:text-base">
                <span>ลงชื่อ</span>

                {guarantorSig ? (
                  <div className="relative h-14 w-48 flex items-center justify-center border-b border-dotted border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={guarantorSig}
                      alt="ลายเซ็นผู้รับรอง"
                      className="h-14 max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleClearSignature("guarantor")}
                      className="print:hidden absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs hover:bg-rose-600 transition-colors cursor-pointer text-xs font-bold"
                      title="ลบลายเซ็นเพื่อเซ็นใหม่"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveSignRole("guarantor")}
                    className="print:hidden h-14 w-48 flex flex-col items-center justify-center border-2 border-dashed border-amber-400 bg-amber-50/70 rounded-lg hover:bg-amber-100/80 transition-all text-amber-900 text-xs font-sans font-bold cursor-pointer group"
                  >
                    <PenTool className="size-4 text-amber-700 group-hover:scale-110 transition-transform mb-0.5" />
                    <span>แตะเพื่อเซ็นชื่อผู้รับรอง</span>
                  </button>
                )}

                {/* Print placeholder if empty */}
                {!guarantorSig && (
                  <div className="hidden print:block h-14 w-48 border-b border-dotted border-zinc-700" />
                )}
              </div>
              <div className="text-sm sm:text-base text-zinc-900 mt-1">
                ( {loan.guarantorName || "................................................"} )
              </div>
              {loan.guarantorPhone && (
                <div className="text-xs text-zinc-600 mt-0.5">
                  เบอร์โทรผู้รับรอง: {loan.guarantorPhone}
                </div>
              )}
            </div>
          )}

          {/* Footer Note (Upfront Deduction or Summary Note) */}
          <div className="mt-12 pt-6 border-t border-zinc-200 text-xs sm:text-sm text-zinc-800 font-sans">
            {loan.isUpfrontDeduction ? (
              <p className="font-semibold">
                - ยอด {loan.initialPrincipal.toLocaleString()} หักดอก {loan.upfrontDeductionAmount.toLocaleString()} โอน {loan.disbursedAmount.toLocaleString()} นัดจ่ายวันที่ {dueDateSummary} ({loan.initialPrincipal.toLocaleString()})
              </p>
            ) : (
              <p className="text-zinc-600">
                - ยอดกู้ {loan.initialPrincipal.toLocaleString()} บาท กำหนดชำระทุกรอบ {loan.termType === "DAYS_7" ? "7 วัน" : "10 วัน"} นัดจ่ายวันที่ {dueDateSummary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Thermal Mini-Contract Modal (58mm/80mm Portable Bluetooth) */}
      {isThermalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm hide-on-thermal">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Receipt className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">สลิปสัญญาเงินกู้ความร้อน</h3>
                  <p className="text-[10px] text-zinc-500">ESC/POS 58mm / 80mm Bluetooth</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsThermalModalOpen(false)}
                className="size-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Paper Width Selector */}
            <div className="mt-3 flex items-center justify-between text-xs px-1">
              <span className="text-zinc-500 font-semibold flex items-center gap-1">
                <Smartphone className="size-3.5 text-zinc-400" />
                <span>ขนาดกระดาษพิมพ์:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setThermalWidth(58);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    thermalWidth === 58 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
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
                    thermalWidth === 80 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  80 mm (ตั้งโต๊ะ)
                </button>
              </div>
            </div>

            {/* Thermal Mini-Slip Preview */}
            <div 
              className={`mt-3 mx-auto w-full bg-white border border-zinc-300 rounded-xl p-3.5 shadow-inner text-black font-mono text-[11px] leading-snug ${
                thermalWidth === 58 ? "max-w-[280px]" : "max-w-[360px]"
              }`}
            >
              <div className="text-center pb-2 border-b border-dashed border-zinc-400">
                <p className="font-extrabold text-xs tracking-wider">LT LOAN TRACKER</p>
                <p className="text-[10px]">สัญญากู้ยืมเงิน (ฉบับย่อ/มินิสลิป)</p>
                <p className="text-[9px] text-zinc-500">สาขา เกษตรสมบูรณ์ ชัยภูมิ</p>
              </div>

              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>เลขที่สัญญา:</span>
                  <span className="font-bold">{loan.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>วันที่ทำสัญญา:</span>
                  <span>{dayStr} {monthStr} {yearStr}</span>
                </div>
                <div className="flex justify-between">
                  <span>สถานที่ทำ:</span>
                  <span>{loan.contractPlace || "บ้านเป้า"}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>ผู้ให้กู้:</span>
                  <span className="font-semibold">น.ส.ฟิลิปดา ภาปัญญา</span>
                </div>
                <div className="flex justify-between">
                  <span>ผู้กู้:</span>
                  <span className="font-bold">{loan.borrower.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span>เลขบัตร:</span>
                  <span>{loan.borrower.citizenId}</span>
                </div>
                <div className="flex justify-between">
                  <span>เบอร์โทร:</span>
                  <span>{loan.borrower.phone}</span>
                </div>
                {loan.guarantorName && (
                  <div className="flex justify-between pt-1 border-t border-dotted border-zinc-300">
                    <span>ผู้ค้ำ/รับรอง:</span>
                    <span>{loan.guarantorName}</span>
                  </div>
                )}
              </div>

              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>ยอดเงินกู้:</span>
                  <span>{loan.initialPrincipal.toLocaleString()} ฿</span>
                </div>
                <div className="flex justify-between">
                  <span>รอบสัญญา:</span>
                  <span>{loan.termType === "DAYS_7" ? "ทุก 7 วัน (15%)" : "ทุก 10 วัน (20%)"}</span>
                </div>
                {loan.isUpfrontDeduction && (
                  <>
                    <div className="flex justify-between">
                      <span>หักดอกล่วงหน้า:</span>
                      <span>-{loan.upfrontDeductionAmount.toLocaleString()} ฿</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>ยอดโอนจริง:</span>
                      <span>{loan.disbursedAmount.toLocaleString()} ฿</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-dotted border-zinc-300">
                  <span>กำหนดชำระคืน:</span>
                  <span>{dueDateSummary}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>เบี้ยปรับล่าช้า:</span>
                  <span>{loan.dailyPenaltyRate || 50} ฿/วัน</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-zinc-400 text-[10px] text-center text-zinc-700 leading-tight">
                ผู้กู้ได้รับเงินกู้ครบถ้วนแล้ว ตกลงชำระเงินต้นและดอกเบี้ยตามกำหนด หากผิดนัดยินยอมชดใช้ค่าเสียหายและเบี้ยปรับตามกฎหมาย
              </div>

              {/* Signatures in Thermal Slip */}
              <div className="py-2 border-b border-dashed border-zinc-400 grid grid-cols-2 gap-2 text-center text-[10px]">
                <div>
                  <p className="font-semibold mb-1">ลายเซ็นผู้ให้กู้</p>
                  <div className="h-10 flex items-center justify-center">
                    <LenderSignature className="h-9 w-auto object-contain grayscale contrast-200" />
                  </div>
                  <p className="text-[9px] text-zinc-500">(ฟิลิปดา)</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">ลายเซ็นผู้กู้</p>
                  <div className="h-10 flex items-center justify-center">
                    {borrowerSig ? (
                      <img src={borrowerSig} alt="sig" className="h-9 max-w-full object-contain grayscale contrast-200" />
                    ) : (
                      <span className="text-[9px] text-amber-700 italic">ยังไม่ลงนาม</span>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-500">({loan.borrower.fullName})</p>
                </div>
              </div>

              <div className="pt-2 text-center text-[9px] text-zinc-500 space-y-0.5">
                <p>สัญญาอิเล็กทรอนิกส์ตาม พ.ร.บ.ธุรกรรมฯ</p>
                <p>ESC/POS Thermal Contract v1.0</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrintThermal}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="size-4" />
                <span>พิมพ์สลิป ({thermalWidth}mm)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyEscPos}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                {copiedEscPos ? (
                  <>
                    <Check className="size-4 text-emerald-600" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4 text-zinc-500" />
                    <span>คัดลอกข้อความ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Isolated Thermal Print Section for Loan Contract (Rendered in continuous roll when print-thermal is active) */}
      <div id="thermal-print-container" className="hidden show-on-thermal">
        <div 
          className="bg-white p-2 text-black font-mono text-[11px] leading-tight"
          style={{ width: thermalWidth === 58 ? "54mm" : "74mm", margin: "0 auto" }}
        >
          <div className="text-center pb-2 border-b border-dashed border-black">
            <p className="font-extrabold text-xs">LT LOAN TRACKER</p>
            <p className="text-[10px]">สัญญากู้ยืมเงิน (ฉบับย่อ/มินิสลิป)</p>
            <p className="text-[9px]">สาขา เกษตรสมบูรณ์ ชัยภูมิ</p>
          </div>

          <div className="py-2 border-b border-dashed border-black space-y-1">
            <div className="flex justify-between">
              <span>เลขที่สัญญา:</span>
              <span className="font-bold">{loan.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>วันที่ทำสัญญา:</span>
              <span>{dayStr} {monthStr} {yearStr}</span>
            </div>
            <div className="flex justify-between">
              <span>สถานที่ทำ:</span>
              <span>{loan.contractPlace || "บ้านเป้า"}</span>
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-black space-y-1">
            <div className="flex justify-between">
              <span>ผู้ให้กู้:</span>
              <span>น.ส.ฟิลิปดา ภาปัญญา</span>
            </div>
            <div className="flex justify-between">
              <span>ผู้กู้:</span>
              <span className="font-bold">{loan.borrower.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span>เลขบัตร:</span>
              <span>{loan.borrower.citizenId}</span>
            </div>
            <div className="flex justify-between">
              <span>เบอร์โทร:</span>
              <span>{loan.borrower.phone}</span>
            </div>
            {loan.guarantorName && (
              <div className="flex justify-between pt-1 border-t border-dotted border-black">
                <span>ผู้ค้ำ/รับรอง:</span>
                <span>{loan.guarantorName}</span>
              </div>
            )}
          </div>

          <div className="py-2 border-b border-dashed border-black space-y-1">
            <div className="flex justify-between font-bold">
              <span>ยอดเงินกู้:</span>
              <span>{loan.initialPrincipal.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between">
              <span>รอบสัญญา:</span>
              <span>{loan.termType === "DAYS_7" ? "ทุก 7 วัน (15%)" : "ทุก 10 วัน (20%)"}</span>
            </div>
            {loan.isUpfrontDeduction && (
              <>
                <div className="flex justify-between">
                  <span>หักดอกล่วงหน้า:</span>
                  <span>-{loan.upfrontDeductionAmount.toLocaleString()} ฿</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>ยอดโอนจริง:</span>
                  <span>{loan.disbursedAmount.toLocaleString()} ฿</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
              <span>กำหนดชำระคืน:</span>
              <span>{dueDateSummary}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>เบี้ยปรับล่าช้า:</span>
              <span>{loan.dailyPenaltyRate || 50} ฿/วัน</span>
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-black text-[10px] text-center leading-tight">
            ผู้กู้ได้รับเงินกู้ครบถ้วนแล้ว ตกลงชำระเงินต้นและดอกเบี้ยตามกำหนด หากผิดนัดยินยอมชดใช้เบี้ยปรับตามสัญญา
          </div>

          <div className="py-2 border-b border-dashed border-black grid grid-cols-2 gap-2 text-center text-[10px]">
            <div>
              <p className="font-semibold mb-1">ผู้ให้กู้</p>
              <div className="h-10 flex items-center justify-center">
                <LenderSignature className="h-9 w-auto object-contain grayscale contrast-200" />
              </div>
              <p className="text-[9px]">(ฟิลิปดา)</p>
            </div>
            <div>
              <p className="font-semibold mb-1">ผู้กู้</p>
              <div className="h-10 flex items-center justify-center">
                {borrowerSig ? (
                  <img src={borrowerSig} alt="sig" className="h-9 max-w-full object-contain grayscale contrast-200" />
                ) : (
                  <span className="text-[9px] italic">ยังไม่ลงนาม</span>
                )}
              </div>
              <p className="text-[9px]">({loan.borrower.fullName})</p>
            </div>
          </div>

          <div className="pt-2 text-center text-[9px] text-zinc-600 space-y-0.5">
            <p>สัญญาอิเล็กทรอนิกส์ตาม พ.ร.บ.ธุรกรรมฯ</p>
            <p>ESC/POS Thermal Contract v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
