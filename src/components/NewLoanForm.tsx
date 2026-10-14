"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createLoanAction } from "@/app/actions/loans";
import { 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  UserCheck, 
  User, 
  Shield, 
  Coins,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { QuickAddBorrowerModal, CreatedBorrower } from "@/components/QuickAddBorrowerModal";
import { formatThaiDate } from "@/lib/date";

interface BorrowerOption {
  id: string;
  fullName: string;
  phone: string;
  creditGrade: string;
  creditLimit: number;
  activePrincipal: number;
  availableCredit: number;
}

export function NewLoanForm({ borrowers }: { borrowers: BorrowerOption[] }) {
  const router = useRouter();

  const [borrowerList, setBorrowerList] = useState<BorrowerOption[]>(borrowers);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState(
    borrowers[0]?.id ?? ""
  );
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [principal, setPrincipal] = useState<number>(1000);
  const [termType, setTermType] = useState<"DAYS_7" | "DAYS_10">("DAYS_10");
  const [processingFee, setProcessingFee] = useState<number>(0);

  // Contract & Guarantee Configuration
  const [contractType, setContractType] = useState<"STANDARD" | "GUARANTEED">("STANDARD");
  const [guarantorName, setGuarantorName] = useState<string>("");
  const [guarantorPhone, setGuarantorPhone] = useState<string>("");
  const [guarantorCitizenId, setGuarantorCitizenId] = useState<string>("");
  const [contractPlace, setContractPlace] = useState<string>("บ้านเป้า");
  const [dailyPenaltyRate, setDailyPenaltyRate] = useState<number>(50);
  
  // Upfront Interest Deduction
  const [isUpfrontDeduction, setIsUpfrontDeduction] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedBorrower = borrowerList.find((b) => b.id === selectedBorrowerId);

  const handleQuickAddSuccess = (newBorrower: CreatedBorrower) => {
    setBorrowerList((prev) => [newBorrower, ...prev]);
    setSelectedBorrowerId(newBorrower.id);
  };

  // Calculations
  const rate = termType === "DAYS_7" ? 0.15 : 0.20;
  const termDays = termType === "DAYS_7" ? 7 : 10;
  const cycleInterest = principal * rate;
  
  const upfrontAmount = isUpfrontDeduction ? cycleInterest : 0;
  const netDisbursed = Math.max(0, principal - upfrontAmount - processingFee);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + termDays);
  const dueDateStr = formatThaiDate(dueDate, { showDayOfWeek: true });

  const isExceedingCredit =
    selectedBorrower && principal > selectedBorrower.availableCredit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedBorrowerId) {
      setErrorMsg("กรุณาเลือกลูกหนี้");
      return;
    }

    if (principal <= 0) {
      setErrorMsg("กรุณาระบุเงินต้นที่มากกว่า 0");
      return;
    }

    if (isExceedingCredit) {
      setErrorMsg(
        `ยอดเงินต้นเกินวงเงินคงเหลือของลูกหนี้ (เหลือปล่อยได้ ${selectedBorrower?.availableCredit.toLocaleString()} ฿)`
      );
      return;
    }

    if (contractType === "GUARANTEED" && !guarantorName.trim()) {
      setErrorMsg("กรุณาระบุชื่อ-นามสกุล ของผู้รับรอง / ผู้ค้ำประกัน");
      return;
    }

    setIsSubmitting(true);

    const res = await createLoanAction({
      borrowerId: selectedBorrowerId,
      principal,
      termType,
      processingFee,
      contractType,
      contractPlace,
      dailyPenaltyRate,
      isUpfrontDeduction,
      guarantorName: contractType === "GUARANTEED" ? guarantorName : undefined,
      guarantorPhone: contractType === "GUARANTEED" ? guarantorPhone : undefined,
      guarantorCitizenId: contractType === "GUARANTEED" ? guarantorCitizenId : undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.loanId) {
      // Redirect to the contract view immediately
      router.push(`/loans/${res.loanId}/contract`);
      router.refresh();
    } else {
      setErrorMsg(res.error ?? "เกิดข้อผิดพลาดในการสร้างสัญญา");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pb-8">
      {/* 1. ประเภทสัญญา (Standard vs Guaranteed) */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
        <label className="block text-xs font-bold text-zinc-800 mb-2">
          รูปแบบสัญญากู้ยืมเงิน
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setContractType("STANDARD")}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all active:scale-95 ${
              contractType === "STANDARD"
                ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <User className="size-4 mb-1" />
            <span className="text-xs font-bold">กู้ปกติ</span>
            <span className={`text-[10px] ${contractType === "STANDARD" ? "text-zinc-300" : "text-zinc-400"}`}>
              ผู้กู้เซ็นคนเดียว
            </span>
          </button>

          <button
            type="button"
            onClick={() => setContractType("GUARANTEED")}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all active:scale-95 ${
              contractType === "GUARANTEED"
                ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <UserCheck className="size-4 mb-1" />
            <span className="text-xs font-bold">กู้ให้คนอื่น / มีคนรับรอง</span>
            <span className={`text-[10px] ${contractType === "GUARANTEED" ? "text-zinc-300" : "text-zinc-400"}`}>
              เพิ่มช่องรับรองให้ผู้กู้
            </span>
          </button>
        </div>

        {/* ผู้รับรอง (ถ้าเลือกแบบ GUARANTEED) */}
        {contractType === "GUARANTEED" && (
          <div className="mt-3.5 space-y-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Shield className="size-3.5 text-amber-700" />
              <span>ข้อมูลผู้รับรอง (รับรองให้ผู้กู้)</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                ชื่อ-นามสกุล คนรับรอง / คนค้ำ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={guarantorName}
                onChange={(e) => setGuarantorName(e.target.value)}
                placeholder="เช่น นายสมบูรณ์ มั่นคง"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  เลขบัตร ปชช. (ถ้ามี)
                </label>
                <input
                  type="text"
                  maxLength={13}
                  value={guarantorCitizenId}
                  onChange={(e) => setGuarantorCitizenId(e.target.value)}
                  placeholder="13 หลัก"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. เลือกลูกหนี้ */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-zinc-800">
            เลือกลูกหนี้
          </label>
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer select-none active:scale-95"
          >
            <UserPlus className="size-3.5" />
            <span>+ เพิ่มลูกหนี้ใหม่</span>
          </button>
        </div>

        {borrowerList.length > 0 ? (
          <select
            value={selectedBorrowerId}
            onChange={(e) => setSelectedBorrowerId(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 py-2.5 text-xs font-medium text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all"
          >
            <option value="" disabled>-- กรุณาเลือกลูกหนี้ --</option>
            {borrowerList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.fullName} ({b.phone}) — วงเงินเหลือ {b.availableCredit.toLocaleString()} ฿ [{b.creditGrade}]
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-center">
            <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mx-auto mb-2">
              <UserPlus className="size-5" />
            </div>
            <p className="text-xs font-bold text-amber-900">ยังไม่มีรายชื่อลูกหนี้ในระบบ</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              คุณต้องลงทะเบียนข้อมูลลูกหนี้ก่อน จึงจะสามารถเปิดสัญญาเงินกู้ได้
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
              >
                <UserPlus className="size-3.5" />
                <span>+ เพิ่มลูกหนี้ใหม่ตอนนี้</span>
              </button>
              <Link
                href="/borrowers/new"
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-all"
              >
                <span>กรอกแบบละเอียด</span>
              </Link>
            </div>
          </div>
        )}

        {selectedBorrower && (
          <div className="mt-2.5 flex items-center justify-between border-t border-zinc-150 pt-2 text-[11px] text-zinc-500">
            <span>
              วงเงินทั้งหมด:{" "}
              <strong className="text-zinc-800">
                {selectedBorrower.creditLimit.toLocaleString()} ฿
              </strong>
            </span>
            <span>
              คงเหลือปล่อยได้:{" "}
              <strong
                className={
                  selectedBorrower.availableCredit > 0
                    ? "text-emerald-700 font-bold"
                    : "text-rose-700 font-bold"
                }
              >
                {selectedBorrower.availableCredit.toLocaleString()} ฿
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* 3. จำนวนเงินต้น */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-zinc-800">
            เงินต้นในสัญญา (บาท)
          </label>
          <span className="font-mono text-xs text-zinc-400">
            {principal.toLocaleString()} THB
          </span>
        </div>

        <input
          type="number"
          inputMode="decimal"
          min="100"
          step="100"
          value={principal || ""}
          onChange={(e) => setPrincipal(Number(e.target.value))}
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 py-2.5 font-mono text-lg font-bold text-zinc-900 tabular-nums focus:bg-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all"
        />

        {/* Quick Amount Pills */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[1000, 2000, 3000, 5000, 10000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setPrincipal(amt)}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono tabular-nums transition-all active:scale-95 shadow-2xs ${
                principal === amt
                  ? "bg-zinc-900 text-white font-bold"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
              }`}
            >
              +{amt.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* 4. เลือกรอบสัญญา & หักดอกล่วงหน้า */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
        <label className="block text-xs font-bold text-zinc-800 mb-2">
          รอบสัญญา & ดอกเบี้ย
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTermType("DAYS_7")}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all active:scale-95 ${
              termType === "DAYS_7"
                ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <span className="text-sm font-semibold">รอบ 7 วัน</span>
            <span className={`text-[11px] ${termType === "DAYS_7" ? "text-zinc-300" : "text-zinc-500"}`}>
              ดอกเบี้ย 15% ({((principal * 0.15)).toLocaleString()} ฿)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTermType("DAYS_10")}
            className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all active:scale-95 ${
              termType === "DAYS_10"
                ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <span className="text-sm font-semibold">รอบ 10 วัน</span>
            <span className={`text-[11px] ${termType === "DAYS_10" ? "text-zinc-300" : "text-zinc-500"}`}>
              ดอกเบี้ย 20% ({((principal * 0.20)).toLocaleString()} ฿)
            </span>
          </button>
        </div>

        {/* หักดอกล่วงหน้า Toggle */}
        <div className="mt-3.5 rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3 transition-colors">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isUpfrontDeduction}
              onChange={(e) => setIsUpfrontDeduction(e.target.checked)}
              className="size-4.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Coins className="size-3.5 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">
                  หักดอกเบี้ยล่วงหน้า (หัก {cycleInterest.toLocaleString()} ฿)
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                โอนให้ลูกหนี้จริง {netDisbursed.toLocaleString()} บาท เมื่อถึงกำหนดชำระคืนเต็ม {principal.toLocaleString()} บาท
              </p>
            </div>
          </label>
        </div>

        {/* รายละเอียดเพิ่มเติม: สถานที่ทำสัญญา & ค่าปรับ */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-zinc-150 pt-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
              ทำที่ (สถานที่)
            </label>
            <input
              type="text"
              value={contractPlace}
              onChange={(e) => setContractPlace(e.target.value)}
              placeholder="บ้านเป้า"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
              เบี้ยปรับผิดสัญญา (บาท/วัน)
            </label>
            <input
              type="number"
              value={dailyPenaltyRate || ""}
              onChange={(e) => setDailyPenaltyRate(Number(e.target.value))}
              placeholder="50"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-mono text-zinc-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 5. สรุปคำนวณอัตโนมัติ */}
      <div className="rounded-2xl border border-zinc-200 bg-slate-100/90 p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 mb-2.5">
          <Calculator className="size-4 text-zinc-600" />
          <span>สรุปการโอนเงินและออกสัญญา</span>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">ยอดกู้ในสัญญา:</span>
            <span className="font-mono font-bold text-zinc-900">
              {principal.toLocaleString()} ฿
            </span>
          </div>

          {isUpfrontDeduction && (
            <div className="flex items-center justify-between text-amber-800">
              <span>หักดอกเบี้ยล่วงหน้า:</span>
              <span className="font-mono font-bold">
                -{cycleInterest.toLocaleString()} ฿
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
            <span className="font-semibold text-zinc-800">ยอดโอนให้ผู้กู้จริง:</span>
            <span className="font-mono text-base font-bold tabular-nums text-emerald-700">
              {netDisbursed.toLocaleString()} ฿
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
            <span className="text-zinc-600">นัดชำระงวดแรก ({principal.toLocaleString()} ฿):</span>
            <span className="font-bold text-zinc-900" suppressHydrationWarning>{dueDateStr}</span>
          </div>

          <div className="mt-1 rounded-lg bg-zinc-200/60 p-2 text-[11px] font-mono text-zinc-700">
            {isUpfrontDeduction ? (
              <span>
                - ยอด {principal.toLocaleString()} หักดอก {cycleInterest.toLocaleString()} โอน {netDisbursed.toLocaleString()} นัดจ่ายวันที่ {dueDate.toLocaleDateString("th-TH", { day: "numeric", month: "numeric", year: "2-digit" })} ({principal.toLocaleString()})
              </span>
            ) : (
              <span>
                - ยอดกู้ {principal.toLocaleString()} โอนเต็ม {netDisbursed.toLocaleString()} ดอกเบี้ยต่องวด {cycleInterest.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || Boolean(isExceedingCredit)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 select-none cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>กำลังบันทึกและสร้างสัญญา...</span>
          </>
        ) : (
          <>
            <FileText className="size-4" />
            <span>เปิดสัญญา & ไปหน้าเซ็นชื่อ / พิมพ์ ({principal.toLocaleString()} ฿)</span>
          </>
        )}
      </button>
      {/* Quick Add Borrower Modal */}
      <QuickAddBorrowerModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </form>
  );
}
