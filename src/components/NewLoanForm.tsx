"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createLoanAction } from "@/app/actions/loans";
import { createBorrowerAction, checkBorrowerRiskAction } from "@/app/actions/borrowers";
import { 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  FileText, 
  UserCheck, 
  User, 
  Shield, 
  Coins,
  UserPlus,
  Users,
  Calendar,
  Percent,
  CreditCard,
  Phone,
  Briefcase,
  MapPin,
  Wallet,
  ExternalLink,
  Lock
} from "lucide-react";
import Link from "next/link";
import { QuickAddBorrowerModal, CreatedBorrower } from "@/components/QuickAddBorrowerModal";
import { formatThaiDate } from "@/lib/date";

export interface BorrowerOption {
  id: string;
  fullName: string;
  phone: string;
  creditGrade: string;
  creditLimit: number;
  activePrincipal: number;
  availableCredit: number;
}

interface NewLoanFormProps {
  borrowers: BorrowerOption[];
  cashBalance?: number;
  userRole?: "OWNER" | "AGENT";
}

export function NewLoanForm({ borrowers, cashBalance = 0, userRole = "OWNER" }: NewLoanFormProps) {
  const router = useRouter();

  // Mode: Existing Borrower vs Walk-in New Borrower
  const [borrowerMode, setBorrowerMode] = useState<"EXISTING" | "WALKIN">("EXISTING");

  // Existing Borrower State
  const [borrowerList, setBorrowerList] = useState<BorrowerOption[]>(borrowers);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>(
    borrowers[0]?.id ?? ""
  );
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Walk-in Borrower State
  const [walkinFullName, setWalkinFullName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinCitizenId, setWalkinCitizenId] = useState("");
  const [walkinWorkplace, setWalkinWorkplace] = useState("");
  const [walkinAddress, setWalkinAddress] = useState("");
  const [walkinCreditLimit, setWalkinCreditLimit] = useState<number>(2000);

  // Loan Terms & Principal
  const [principal, setPrincipal] = useState<number>(1000);
  const [termType, setTermType] = useState<"DAYS_7" | "DAYS_10" | "CUSTOM">("DAYS_10");
  const [customDays, setCustomDays] = useState<number>(15);
  const [customInterestRate, setCustomInterestRate] = useState<number>(20);
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

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Risk & Duplicate check states
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string;
    fullName: string;
    citizenId: string;
    phone: string;
    reason: string;
  } | null>(null);

  const [crossGuarantorWarning, setCrossGuarantorWarning] = useState<string | null>(null);

  const selectedBorrower = borrowerList.find((b) => b.id === selectedBorrowerId);

  const isAgent = userRole === "AGENT";
  const isSelectedBorrowerLocked =
    borrowerMode === "EXISTING" &&
    isAgent &&
    (selectedBorrower?.creditGrade === "BLACKLIST" || selectedBorrower?.creditGrade === "WATCHLIST");

  // Debounced risk check
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      const citizenIdToCheck = borrowerMode === "WALKIN" ? walkinCitizenId : undefined;
      const phoneToCheck = borrowerMode === "WALKIN" ? walkinPhone : undefined;
      const guarantorPhoneToCheck = contractType === "GUARANTEED" ? guarantorPhone : undefined;

      if (
        (citizenIdToCheck && citizenIdToCheck.length >= 10) ||
        (phoneToCheck && phoneToCheck.length >= 9) ||
        (guarantorPhoneToCheck && guarantorPhoneToCheck.length >= 9)
      ) {
        const res = await checkBorrowerRiskAction({
          citizenId: citizenIdToCheck,
          phone: phoneToCheck,
          guarantorPhone: guarantorPhoneToCheck,
        });

        if (res.success) {
          setDuplicateWarning(res.duplicateBorrower ?? null);
          setCrossGuarantorWarning(res.crossGuarantorAlert?.warningMessage ?? null);
        }
      } else {
        setDuplicateWarning(null);
        setCrossGuarantorWarning(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [borrowerMode, walkinCitizenId, walkinPhone, contractType, guarantorPhone]);

  // Reset state when switching borrower tabs
  const handleModeChange = (mode: "EXISTING" | "WALKIN") => {
    setBorrowerMode(mode);
    setErrorMsg(null);
    setFieldErrors({});
    setDuplicateWarning(null);
    setCrossGuarantorWarning(null);

    if (mode === "WALKIN") {
      setSelectedBorrowerId("");
    } else {
      setWalkinFullName("");
      setWalkinPhone("");
      setWalkinCitizenId("");
      setWalkinWorkplace("");
      setWalkinAddress("");
      setWalkinCreditLimit(2000);
      if (borrowerList.length > 0 && !selectedBorrowerId) {
        setSelectedBorrowerId(borrowerList[0].id);
      }
    }
  };

  const handleQuickAddSuccess = (newBorrower: CreatedBorrower) => {
    setBorrowerList((prev) => [newBorrower, ...prev]);
    setSelectedBorrowerId(newBorrower.id);
  };

  // Calculations
  const rate =
    termType === "DAYS_7"
      ? 0.15
      : termType === "DAYS_10"
      ? 0.20
      : (customInterestRate || 0) / 100;

  const termDays =
    termType === "DAYS_7"
      ? 7
      : termType === "DAYS_10"
      ? 10
      : customDays > 0
      ? customDays
      : 10;

  const cycleInterest = principal * rate;
  const upfrontAmount = isUpfrontDeduction ? cycleInterest : 0;
  const netDisbursed = Math.max(0, principal - upfrontAmount - processingFee);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + termDays);
  const dueDateStr = formatThaiDate(dueDate, { showDayOfWeek: true });

  const effectiveAvailableCredit =
    borrowerMode === "EXISTING"
      ? selectedBorrower?.availableCredit ?? 0
      : walkinCreditLimit;

  const isExceedingCredit = principal > effectiveAvailableCredit;
  const isCashInsufficient = cashBalance > 0 && netDisbursed > cashBalance;

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (borrowerMode === "EXISTING") {
      if (!selectedBorrowerId) {
        errors.borrower = "กรุณาเลือกลูกหนี้เดิมจากระบบ";
      } else if (selectedBorrower && principal > selectedBorrower.availableCredit) {
        errors.principal = `ยอดเงินกู้เกินวงเงินคงเหลือของลูกหนี้ (เหลือปล่อยได้ ${selectedBorrower.availableCredit.toLocaleString()} ฿)`;
      }
    } else {
      // Walk-in validations
      if (!walkinFullName.trim()) {
        errors.walkinFullName = "กรุณากรอกชื่อ-นามสกุลของผู้กู้รายใหม่";
      }
      if (!walkinPhone.trim()) {
        errors.walkinPhone = "กรุณากรอกเบอร์โทรศัพท์ที่ติดต่อได้";
      }
      const cleanId = walkinCitizenId.replace(/\D/g, "");
      if (cleanId.length !== 13) {
        errors.walkinCitizenId = "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";
      }
      if (principal > walkinCreditLimit) {
        errors.principal = `ยอดเงินกู้เกินวงเงินเริ่มต้นที่กำหนด (${walkinCreditLimit.toLocaleString()} ฿)`;
      }
    }

    if (principal <= 0) {
      errors.principal = "กรุณาระบุเงินต้นที่มากกว่า 0 บาท";
    }

    if (isCashInsufficient) {
      errors.cash = `เงินสดสำรองในกองกลางไม่พอ (คงเหลือ ${cashBalance.toLocaleString()} ฿, ต้องจ่ายจริง ${netDisbursed.toLocaleString()} ฿)`;
    }

    if (termType === "CUSTOM") {
      if (!customDays || customDays <= 0) {
        errors.customDays = "กรุณาระบุจำนวนวันมากกว่า 0 วัน";
      }
      if (customInterestRate < 0) {
        errors.customInterestRate = "กรุณาระบุดอกเบี้ย 0% ขึ้นไป";
      }
    }

    if (contractType === "GUARANTEED" && !guarantorName.trim()) {
      errors.guarantorName = "กรุณาระบุชื่อ-นามสกุลของผู้รับรอง / ผู้ค้ำประกัน";
    }

    if (isSelectedBorrowerLocked) {
      errors.borrower = `ลูกหนี้ติดสถานะ ${selectedBorrower?.creditGrade} — สายตรวจ (Agent) ไม่มีสิทธิ์เปิดสัญญา (สงวนสิทธิ์เฉพาะนายทุนเท่านั้น)`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateForm()) {
      setErrorMsg("กรุณาตรวจสอบข้อมูลในฟอร์มให้ถูกต้องครบถ้วน");
      return;
    }

    setIsSubmitting(true);

    try {
      let targetBorrowerId = selectedBorrowerId;

      // If Walk-in, create the borrower first
      if (borrowerMode === "WALKIN") {
        const createBorrowerRes = await createBorrowerAction({
          citizenId: walkinCitizenId.replace(/\D/g, ""),
          fullName: walkinFullName.trim(),
          phone: walkinPhone.trim(),
          workplace: walkinWorkplace.trim() || undefined,
          addressOnCard: walkinAddress.trim() || undefined,
          creditLimit: walkinCreditLimit || 2000,
          creditGrade: "NEW",
        });

        if (!createBorrowerRes.success || !createBorrowerRes.borrowerId) {
          setIsSubmitting(false);
          setErrorMsg(createBorrowerRes.error ?? "ไม่สามารถลงทะเบียนผู้กู้ใหม่ได้");
          return;
        }

        targetBorrowerId = createBorrowerRes.borrowerId;
      }

      // Create Loan Action
      const res = await createLoanAction({
        borrowerId: targetBorrowerId,
        principal,
        termType,
        customDays: termType === "CUSTOM" ? customDays : undefined,
        customInterestRate: termType === "CUSTOM" ? rate : undefined,
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
        router.push(`/loans/${res.loanId}/contract`);
        router.refresh();
      } else {
        setErrorMsg(res.error ?? "เกิดข้อผิดพลาดในการสร้างสัญญา");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message ?? "เกิดข้อผิดพลาดที่ไม่คาดคิด");
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
            className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all active:scale-95 cursor-pointer ${
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
            className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all active:scale-95 cursor-pointer ${
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
                onChange={(e) => {
                  setGuarantorName(e.target.value);
                  if (fieldErrors.guarantorName) setFieldErrors((prev) => ({ ...prev, guarantorName: "" }));
                }}
                placeholder="เช่น นายสมบูรณ์ มั่นคง"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-600 ${
                  fieldErrors.guarantorName ? "border-rose-400 bg-rose-50/30" : "border-zinc-300"
                }`}
              />
              {fieldErrors.guarantorName && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.guarantorName}</p>
              )}
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

            {crossGuarantorWarning && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-medium">{crossGuarantorWarning}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. การเลือกลูกหนี้: ลูกหนี้เดิม vs ผู้กู้รายใหม่ (Walk-in) */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
        <label className="block text-xs font-bold text-zinc-800 mb-2">
          ผู้กู้เงินในสัญญา
        </label>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 mb-3.5">
          <button
            type="button"
            onClick={() => handleModeChange("EXISTING")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
              borrowerMode === "EXISTING"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Users className="size-3.5" />
            <span>เลือกลูกหนี้เดิม ({borrowerList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("WALKIN")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
              borrowerMode === "WALKIN"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <UserPlus className="size-3.5" />
            <span>ผู้กู้รายใหม่ (Walk-in)</span>
          </button>
        </div>

        {/* Tab 1: Existing Borrower */}
        {borrowerMode === "EXISTING" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">รายชื่อในระบบ:</span>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer select-none active:scale-95"
              >
                <UserPlus className="size-3.5" />
                <span>+ เพิ่มลูกหนี้ด่วน</span>
              </button>
            </div>

            {borrowerList.length > 0 ? (
              <div>
                <select
                  value={selectedBorrowerId}
                  onChange={(e) => {
                    setSelectedBorrowerId(e.target.value);
                    if (fieldErrors.borrower) setFieldErrors((prev) => ({ ...prev, borrower: "" }));
                  }}
                  className={`w-full rounded-xl border bg-zinc-50/70 px-3 py-2.5 text-xs font-medium text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all ${
                    fieldErrors.borrower ? "border-rose-400" : "border-zinc-300"
                  }`}
                >
                  <option value="" disabled>-- กรุณาเลือกลูกหนี้ --</option>
                  {borrowerList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.fullName} ({b.phone}) — วงเงินเหลือ {b.availableCredit.toLocaleString()} ฿ [{b.creditGrade}]
                    </option>
                  ))}
                </select>
                {fieldErrors.borrower && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.borrower}</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-center">
                <p className="text-xs font-bold text-amber-900">ยังไม่มีรายชื่อลูกหนี้ในระบบ</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  คุณสามารถสลับไปแท็บ "ผู้กู้รายใหม่ (Walk-in)" เพื่อเปิดสัญญาพร้อมลงทะเบียนได้ทันที
                </p>
                <button
                  type="button"
                  onClick={() => handleModeChange("WALKIN")}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-zinc-800"
                >
                  <UserPlus className="size-3.5" />
                  <span>สลับไปกรอกลูกหนี้ใหม่ (Walk-in)</span>
                </button>
              </div>
            )}

            {selectedBorrower && (
              <div className="mt-2.5 border-t border-zinc-150 pt-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
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

                {/* Prominent Watchlist / Blacklist Warning & Lock */}
                {(selectedBorrower.creditGrade === "WATCHLIST" || selectedBorrower.creditGrade === "BLACKLIST") && (
                  <div className={`rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
                    selectedBorrower.creditGrade === "BLACKLIST"
                      ? "border-rose-300 bg-rose-50 text-rose-900"
                      : "border-amber-300 bg-amber-50 text-amber-900"
                  }`}>
                    {isSelectedBorrowerLocked ? (
                      <Lock className="size-4 shrink-0 text-rose-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">
                        {isSelectedBorrowerLocked
                          ? `🔒 ล็อกสิทธิ์ปล่อยกู้ (ติดสถานะ ${selectedBorrower.creditGrade})`
                          : `⚠️ คำเตือนความเสี่ยง (สถานะ ${selectedBorrower.creditGrade})`}
                      </p>
                      <p className="text-[11px] mt-0.5">
                        {isSelectedBorrowerLocked
                          ? `ลูกหนี้ติดสถานะ ${selectedBorrower.creditGrade} ไม่อนุญาตให้สายตรวจ (Agent) ปล่อยกู้ สงวนสิทธิ์เฉพาะนายทุน (Owner) เท่านั้น`
                          : `ลูกหนี้ติดสถานะ ${selectedBorrower.creditGrade} นายทุนสามารถพิจารณาอนุมัติเป็นกรณีพิเศษได้`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Walk-in New Borrower */}
        {borrowerMode === "WALKIN" && (
          <div className="space-y-3 animate-in fade-in-50 duration-200">
            <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-2.5 text-xs text-blue-900">
              <span className="font-bold">✨ โหมดลูกหนี้ใหม่ (Walk-in):</span>
              <p className="text-[11px] text-blue-700 mt-0.5">
                กรอกข้อมูลผู้กู้ใหม่ตรงนี้ ระบบจะบันทึกลงฐานข้อมูลและสร้างสัญญาให้ในขั้นตอนเดียว
              </p>
            </div>

            {/* Live Duplicate Warning Alert in Walk-in */}
            {duplicateWarning && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">⚠️ ตรวจพบข้อมูลซ้ำ: {duplicateWarning.reason}</p>
                    <p className="text-[11px] text-zinc-700 mt-0.5">
                      ตรงกับ: <strong>{duplicateWarning.fullName}</strong> ({duplicateWarning.phone})
                    </p>
                    <Link
                      href={`/borrowers/${duplicateWarning.id}`}
                      className="mt-1 inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
                    >
                      <span>คลิกเพื่อดูโปรไฟล์ลูกหนี้รายเดิมนี้</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Live Cross-Guarantor Warning in Walk-in */}
            {crossGuarantorWarning && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-medium">{crossGuarantorWarning}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                ชื่อ-นามสกุล ลูกหนี้ใหม่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น นายสมชาย ปลอดโปร่ง"
                value={walkinFullName}
                onChange={(e) => {
                  setWalkinFullName(e.target.value);
                  if (fieldErrors.walkinFullName) setFieldErrors((prev) => ({ ...prev, walkinFullName: "" }));
                }}
                className={`h-10 w-full rounded-xl border bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                  fieldErrors.walkinFullName ? "border-rose-400 bg-rose-50/30" : "border-zinc-300"
                }`}
              />
              {fieldErrors.walkinFullName && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.walkinFullName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={walkinPhone}
                    onChange={(e) => {
                      setWalkinPhone(e.target.value);
                      if (fieldErrors.walkinPhone) setFieldErrors((prev) => ({ ...prev, walkinPhone: "" }));
                    }}
                    className={`h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                      fieldErrors.walkinPhone ? "border-rose-400 bg-rose-50/30" : "border-zinc-300"
                    }`}
                  />
                </div>
                {fieldErrors.walkinPhone && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.walkinPhone}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-zinc-700">
                    เลขบัตร ปชช. 13 หลัก <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      let randomId = "1";
                      for (let i = 0; i < 12; i++) randomId += Math.floor(Math.random() * 10).toString();
                      setWalkinCitizenId(randomId);
                      if (fieldErrors.walkinCitizenId) setFieldErrors((prev) => ({ ...prev, walkinCitizenId: "" }));
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    สุ่มเลขตัวอย่าง
                  </button>
                </div>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={13}
                    placeholder="เลข 13 หลัก"
                    value={walkinCitizenId}
                    onChange={(e) => {
                      setWalkinCitizenId(e.target.value);
                      if (fieldErrors.walkinCitizenId) setFieldErrors((prev) => ({ ...prev, walkinCitizenId: "" }));
                    }}
                    className={`h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                      fieldErrors.walkinCitizenId ? "border-rose-400 bg-rose-50/30" : "border-zinc-300"
                    }`}
                  />
                </div>
                {fieldErrors.walkinCitizenId && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.walkinCitizenId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  ที่ทำงาน / อาชีพ (ตามตัว)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตลาดสด ซอย 4"
                  value={walkinWorkplace}
                  onChange={(e) => setWalkinWorkplace(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  ตั้งวงเงินเริ่มต้น (บาท)
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={walkinCreditLimit}
                  onChange={(e) => setWalkinCreditLimit(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs font-mono font-bold text-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. จำนวนเงินต้น */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-zinc-800">
            เงินต้นในสัญญา (บาท) <span className="text-rose-500">*</span>
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
          onChange={(e) => {
            setPrincipal(Number(e.target.value));
            if (fieldErrors.principal) setFieldErrors((prev) => ({ ...prev, principal: "" }));
          }}
          className={`w-full rounded-xl border bg-zinc-50/70 px-3 py-2.5 font-mono text-lg font-bold text-zinc-900 tabular-nums focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all ${
            fieldErrors.principal ? "border-rose-400 bg-rose-50/30" : "border-zinc-300"
          }`}
        />

        {fieldErrors.principal && (
          <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.principal}</p>
        )}

        {/* Quick Amount Pills */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[1000, 2000, 3000, 5000, 10000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setPrincipal(amt);
                if (fieldErrors.principal) setFieldErrors((prev) => ({ ...prev, principal: "" }));
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono tabular-nums transition-all active:scale-95 shadow-2xs cursor-pointer ${
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

      {/* 4. เลือกรอบสัญญา & ดอกเบี้ย (7 วัน / 10 วัน / กำหนดเอง Custom) */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
        <label className="block text-xs font-bold text-zinc-800 mb-2">
          รอบสัญญา & ดอกเบี้ย
        </label>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTermType("DAYS_7")}
            className={`flex flex-col items-center justify-center rounded-xl p-2.5 border text-center transition-all active:scale-95 cursor-pointer ${
              termType === "DAYS_7"
                ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xs font-bold">รอบ 7 วัน</span>
            <span className={`text-[10px] ${termType === "DAYS_7" ? "text-zinc-300" : "text-zinc-500"}`}>
              ดอก 15%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTermType("DAYS_10")}
            className={`flex flex-col items-center justify-center rounded-xl p-2.5 border text-center transition-all active:scale-95 cursor-pointer ${
              termType === "DAYS_10"
                ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xs font-bold">รอบ 10 วัน</span>
            <span className={`text-[10px] ${termType === "DAYS_10" ? "text-zinc-300" : "text-zinc-500"}`}>
              ดอก 20%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTermType("CUSTOM")}
            className={`flex flex-col items-center justify-center rounded-xl p-2.5 border text-center transition-all active:scale-95 cursor-pointer ${
              termType === "CUSTOM"
                ? "border-zinc-900 bg-zinc-900 text-white font-bold shadow-xs"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <span className="text-xs font-bold">กำหนดเอง</span>
            <span className={`text-[10px] ${termType === "CUSTOM" ? "text-zinc-300" : "text-zinc-500"}`}>
              Custom Term
            </span>
          </button>
        </div>

        {/* Custom Term Controls */}
        {termType === "CUSTOM" && (
          <div className="mt-3 rounded-xl border border-blue-200/80 bg-blue-50/50 p-3 space-y-2.5 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
              <Calendar className="size-3.5 text-blue-700" />
              <span>กำหนดเงื่อนไขสัญญาแบบยืดหยุ่น</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  จำนวนวันในรอบ (วัน) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays || ""}
                  onChange={(e) => {
                    setCustomDays(Number(e.target.value));
                    if (fieldErrors.customDays) setFieldErrors((prev) => ({ ...prev, customDays: "" }));
                  }}
                  placeholder="เช่น 15"
                  className={`w-full rounded-lg border bg-white px-3 py-1.5 text-xs font-mono font-bold text-zinc-900 focus:outline-none ${
                    fieldErrors.customDays ? "border-rose-400" : "border-zinc-300"
                  }`}
                />
                {fieldErrors.customDays && (
                  <p className="mt-0.5 text-[10px] text-rose-600">{fieldErrors.customDays}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  อัตราดอกเบี้ย (% ต่องวด) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={customInterestRate || ""}
                    onChange={(e) => {
                      setCustomInterestRate(Number(e.target.value));
                      if (fieldErrors.customInterestRate) setFieldErrors((prev) => ({ ...prev, customInterestRate: "" }));
                    }}
                    placeholder="เช่น 20"
                    className={`w-full rounded-lg border bg-white px-3 pr-7 py-1.5 text-xs font-mono font-bold text-zinc-900 focus:outline-none ${
                      fieldErrors.customInterestRate ? "border-rose-400" : "border-zinc-300"
                    }`}
                  />
                  <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-400 pointer-events-none" />
                </div>
                {fieldErrors.customInterestRate && (
                  <p className="mt-0.5 text-[10px] text-rose-600">{fieldErrors.customInterestRate}</p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-blue-700">
              *รูปแบบชำระ: ชำระคืนเงินต้นและดอกเบี้ยเมื่อครบกำหนด {customDays} วัน หรือต่อดอกเบี้ยตามรอบที่ตกลง
            </p>
          </div>
        )}

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

      {/* 5. สรุปคำนวณอัตโนมัติ (Live Summary) */}
      <div className="rounded-2xl border border-zinc-200 bg-slate-100/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
            <Calculator className="size-4 text-zinc-600" />
            <span>สรุปการโอนเงินและออกสัญญา (Real-time)</span>
          </div>

          {cashBalance > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
              <Wallet className="size-3" />
              <span>กองกลาง: {cashBalance.toLocaleString()} ฿</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">ยอดกู้ในสัญญา:</span>
            <span className="font-mono font-bold text-zinc-900">
              {principal.toLocaleString()} ฿
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-600">
            <span>ดอกเบี้ยต่องวด ({((rate * 100)).toFixed(1)}% / {termDays} วัน):</span>
            <span className="font-mono font-bold text-amber-900">
              +{cycleInterest.toLocaleString()} ฿
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
            <span className="font-semibold text-zinc-800">ยอดโอนให้ผู้กู้จริง (Net Payout):</span>
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

      {/* Cash Insufficient Alert */}
      {isCashInsufficient && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in-50 duration-200">
          <AlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>
            ⚠️ เงินสดสำรองในกองกลางไม่เพียงพอต่อการโอนจริง (กองกลางมี {cashBalance.toLocaleString()} ฿, ต้องโอน {netDisbursed.toLocaleString()} ฿)
          </span>
        </div>
      )}

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
        disabled={
          isSubmitting ||
          Boolean(isExceedingCredit) ||
          Boolean(isCashInsufficient) ||
          Boolean(isSelectedBorrowerLocked)
        }
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
