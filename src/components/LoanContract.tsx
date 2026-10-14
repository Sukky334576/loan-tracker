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
  Sparkles
} from "lucide-react";
import { bahtText } from "@/lib/bahttext";
import { formatThaiDate } from "@/lib/date";
import { LenderSignature } from "@/components/LenderSignature";
import { SignaturePad } from "@/components/SignaturePad";
import { saveSignatureAction, clearSignatureAction } from "@/app/actions/contract";

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
  const [isSaving, setIsSaving] = useState(false);

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
    window.print();
  };

  const handleSaveSignature = async (dataUrl: string) => {
    if (!activeSignRole) return;
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

    setIsSaving(false);
    setActiveSignRole(null);
  };

  const handleClearSignature = async (role: "borrower" | "guarantor") => {
    if (!confirm(`คุณต้องการลบลายเซ็นของ${role === "borrower" ? "ผู้กู้" : "ผู้รับรอง"} เพื่อเซ็นใหม่ใช่หรือไม่?`)) {
      return;
    }
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

            {/* Print / Save PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-xs"
            >
              <Printer className="size-3.5" />
              <span>พิมพ์สัญญา (A4 / PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contract Paper A4 Container */}
      <div className="mx-auto max-w-4xl px-2 sm:px-4">
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

      {/* Signature Modal */}
      {activeSignRole && (
        <SignaturePad
          title={
            activeSignRole === "borrower"
              ? `ลงลายมือชื่อผู้กู้ (${loan.borrower.fullName})`
              : `ลงลายมือชื่อผู้รับรอง (${loan.guarantorName || "ผู้รับรอง"})`
          }
          subtitle="กรุณาใช้นิ้วมือหรือปากกาเซ็นชื่อในกรอบ แล้วกดปุ่มบันทึก"
          onSave={handleSaveSignature}
          onClose={() => setActiveSignRole(null)}
        />
      )}
    </div>
  );
}
