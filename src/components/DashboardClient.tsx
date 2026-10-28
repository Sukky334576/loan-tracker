"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/AppShell";
import { LoanCard, LoanCardData } from "@/components/LoanCard";
import { RepaymentDrawer, PaymentSuccessResult } from "@/components/RepaymentDrawer";
import { FundModal } from "@/components/FundModal";
import { deleteLoanAction, writeOffBadDebtAction } from "@/app/actions/loans";
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Wallet, 
  Layers, 
  Search,
  CheckCircle2,
  Trash2,
  Loader2,
  X,
  Download,
  RotateCcw,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { exportToCsv } from "@/lib/export-csv";
import { usePrivacyMode, formatPrivateAmount } from "@/lib/privacy";
import { triggerHaptic } from "@/lib/haptics";

interface DashboardClientProps {
  initialLoans: LoanCardData[];
  initialMetrics: {
    totalPrincipalInMarket: number;
    totalOverdueCount: number;
    dueTodayCount: number;
    cashBalance: number;
    activeLoansCount: number;
    settledCount?: number;
  };
}

export function DashboardClient({
  initialLoans,
  initialMetrics,
}: DashboardClientProps) {
  const router = useRouter();
  const { role } = useRole();
  const { isPrivacy } = usePrivacyMode();

  const [loans, setLoans] = useState<LoanCardData[]>(initialLoans);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "OVERDUE" | "SETTLED" | "BAD_DEBT">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selected Loan for Repayment Drawer
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanCardData | null>(null);

  // Fund Modal (Set / Add Capital)
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  // Loan to Delete (Confirmation Modal)
  const [loanToDelete, setLoanToDelete] = useState<LoanCardData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Loan for Bad Debt Write-Off (Confirmation Modal)
  const [loanForBadDebt, setLoanForBadDebt] = useState<LoanCardData | null>(null);
  const [badDebtReason, setBadDebtReason] = useState("");
  const [isWritingOff, setIsWritingOff] = useState(false);

  // Sync state if server props change
  useEffect(() => {
    setLoans(initialLoans);
    setMetrics(initialMetrics);
  }, [initialLoans, initialMetrics]);

  // Active vs Settled vs Bad Debt Loans
  const activeLoans = loans.filter((l) => l.status !== "SETTLED" && l.status !== "BAD_DEBT");
  const settledLoans = loans.filter((l) => l.status === "SETTLED");
  const badDebtLoans = loans.filter((l) => l.status === "BAD_DEBT");
  const dueTodayLoans = activeLoans.filter((l) => l.daysDiff === 0);
  const overdueLoans = activeLoans.filter((l) => l.status === "OVERDUE" || l.daysDiff < 0);

  const filteredLoans = loans.filter((loan) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      loan.borrowerName.toLowerCase().includes(term) ||
      (loan.nickname && loan.nickname.toLowerCase().includes(term)) ||
      loan.phone.includes(term) ||
      (loan.workplace && loan.workplace.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filter === "ALL") {
      // On "ALL", show active loans only
      return loan.status !== "SETTLED" && loan.status !== "BAD_DEBT";
    }
    if (filter === "TODAY") {
      return loan.status !== "SETTLED" && loan.status !== "BAD_DEBT" && loan.daysDiff === 0;
    }
    if (filter === "OVERDUE") {
      return loan.status !== "SETTLED" && loan.status !== "BAD_DEBT" && (loan.status === "OVERDUE" || loan.daysDiff < 0);
    }
    if (filter === "SETTLED") {
      return loan.status === "SETTLED";
    }
    if (filter === "BAD_DEBT") {
      return loan.status === "BAD_DEBT";
    }
    return true;
  });

  const filterTabs = [
    { id: "ALL" as const, label: "กำลังกู้", count: activeLoans.length, color: "bg-zinc-800 text-white" },
    { id: "TODAY" as const, label: "ต้องเก็บวันนี้", count: dueTodayLoans.length, dot: "bg-amber-500", color: "bg-amber-100 text-amber-800" },
    { id: "OVERDUE" as const, label: "เกินกำหนด", count: overdueLoans.length, dot: "bg-rose-600", color: "bg-rose-100 text-rose-800" },
    { id: "SETTLED" as const, label: "ปิดยอดแล้ว", count: settledLoans.length, dot: "bg-emerald-500", color: "bg-emerald-100 text-emerald-800" },
    ...(badDebtLoans.length > 0 ? [{ id: "BAD_DEBT" as const, label: "หนี้สูญ", count: badDebtLoans.length, dot: "bg-rose-700", color: "bg-rose-100 text-rose-800" }] : []),
  ];

  const handleExportCsv = () => {
    const headers = [
      "ชื่อผู้กู้",
      "เบอร์โทรศัพท์",
      "เงินต้นคงค้าง (บาท)",
      "รอบสัญญา",
      "อัตราดอกเบี้ย",
      "สถานะ",
      "วันครบกำหนด",
      "ค่าปรับค้างชำระ (บาท)",
      "ยอดต้องชำระตัดดอก (บาท)",
    ];

    const rows = filteredLoans.map((loan) => {
      const cycleInterest = loan.remainingPrincipal * loan.interestRate;
      const totalDue = loan.penaltyAccrued + loan.accruedInterest + cycleInterest;
      return [
        loan.borrowerName,
        loan.phone,
        loan.remainingPrincipal,
        loan.termType,
        `${(loan.interestRate * 100).toFixed(0)}%`,
        loan.status,
        new Date(loan.currentDueDate).toLocaleDateString("th-TH"),
        loan.penaltyAccrued,
        totalDue,
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`loans-dashboard-${dateStr}.csv`, headers, rows);
  };

  // Handle Payment Success with Instant Optimistic UI Update
  const handlePaymentSuccess = (result: PaymentSuccessResult) => {
    const prevLoan = loans.find((l) => l.id === result.loanId);
    if (!prevLoan) return;

    if (result.isSettlement) {
      // Turn into settled immediately
      setLoans((prev) =>
        prev.map((l) =>
          l.id === result.loanId
            ? {
                ...l,
                status: "SETTLED",
                remainingPrincipal: 0,
                daysDiff: 0,
                accruedInterest: 0,
                penaltyAccrued: 0,
              }
            : l
        )
      );

      // Update metrics
      setMetrics((prev) => ({
        ...prev,
        totalPrincipalInMarket: Math.max(0, prev.totalPrincipalInMarket - prevLoan.remainingPrincipal),
        cashBalance: prev.cashBalance + result.amountPaid,
        activeLoansCount: Math.max(0, prev.activeLoansCount - 1),
        settledCount: (prev.settledCount ?? settledLoans.length) + 1,
        dueTodayCount: prevLoan.daysDiff === 0 ? Math.max(0, prev.dueTodayCount - 1) : prev.dueTodayCount,
        totalOverdueCount: prevLoan.status === "OVERDUE" || prevLoan.daysDiff < 0 ? Math.max(0, prev.totalOverdueCount - 1) : prev.totalOverdueCount,
      }));
    } else if (result.payType === "PRINCIPAL_CUT") {
      const cut = prevLoan.remainingPrincipal - result.remainingPrincipal;
      const termDays = prevLoan.termType === "DAYS_7" ? 7 : 10;
      setLoans((prev) =>
        prev.map((l) =>
          l.id === result.loanId
            ? {
                ...l,
                remainingPrincipal: result.remainingPrincipal,
                penaltyAccrued: 0,
                accruedInterest: 0,
                daysDiff: termDays,
                status: "ACTIVE",
              }
            : l
        )
      );
      setMetrics((prev) => ({
        ...prev,
        totalPrincipalInMarket: Math.max(0, prev.totalPrincipalInMarket - cut),
        cashBalance: prev.cashBalance + result.amountPaid,
        dueTodayCount: prevLoan.daysDiff === 0 ? Math.max(0, prev.dueTodayCount - 1) : prev.dueTodayCount,
        totalOverdueCount: prevLoan.status === "OVERDUE" || prevLoan.daysDiff < 0 ? Math.max(0, prev.totalOverdueCount - 1) : prev.totalOverdueCount,
      }));
    } else {
      // Interest only
      const termDays = prevLoan.termType === "DAYS_7" ? 7 : 10;
      setLoans((prev) =>
        prev.map((l) =>
          l.id === result.loanId
            ? {
                ...l,
                rolloverCount: l.rolloverCount + 1,
                penaltyAccrued: 0,
                accruedInterest: 0,
                daysDiff: termDays,
                status: "ACTIVE",
              }
            : l
        )
      );
      setMetrics((prev) => ({
        ...prev,
        cashBalance: prev.cashBalance + result.amountPaid,
        dueTodayCount: prevLoan.daysDiff === 0 ? Math.max(0, prev.dueTodayCount - 1) : prev.dueTodayCount,
        totalOverdueCount: prevLoan.status === "OVERDUE" || prevLoan.daysDiff < 0 ? Math.max(0, prev.totalOverdueCount - 1) : prev.totalOverdueCount,
      }));
    }

    // Refresh server data in background
    router.refresh();
  };

  // Handle Delete Loan Action
  const handleConfirmDelete = async () => {
    if (!loanToDelete) return;
    setIsDeleting(true);

    const deletedId = loanToDelete.id;
    const deletedPrincipal = loanToDelete.remainingPrincipal;
    const wasActive = loanToDelete.status !== "SETTLED";

    const res = await deleteLoanAction(deletedId);
    setIsDeleting(false);

    if (res.success) {
      setLoans((prev) => prev.filter((l) => l.id !== deletedId));
      if (wasActive) {
        setMetrics((prev) => ({
          ...prev,
          totalPrincipalInMarket: Math.max(0, prev.totalPrincipalInMarket - deletedPrincipal),
          activeLoansCount: Math.max(0, prev.activeLoansCount - 1),
        }));
      }
      setLoanToDelete(null);
      router.refresh();
    } else {
      alert(res.error ?? "เกิดข้อผิดพลาดในการลบสัญญา");
    }
  };

  // Handle Bad Debt Write-Off Action
  const handleConfirmBadDebt = async () => {
    if (!loanForBadDebt) return;
    setIsWritingOff(true);

    const loanId = loanForBadDebt.id;
    const lossAmount = loanForBadDebt.remainingPrincipal;
    const wasOverdue = loanForBadDebt.status === "OVERDUE" || loanForBadDebt.daysDiff < 0;
    const wasDueToday = loanForBadDebt.daysDiff === 0;

    const res = await writeOffBadDebtAction(loanId, badDebtReason);
    setIsWritingOff(false);

    if (res.success) {
      setLoans((prev) =>
        prev.map((l) =>
          l.id === loanId
            ? {
                ...l,
                status: "BAD_DEBT",
                creditGrade: "BLACKLIST",
              }
            : l
        )
      );
      setMetrics((prev) => ({
        ...prev,
        totalPrincipalInMarket: Math.max(0, prev.totalPrincipalInMarket - lossAmount),
        activeLoansCount: Math.max(0, prev.activeLoansCount - 1),
        totalOverdueCount: wasOverdue ? Math.max(0, prev.totalOverdueCount - 1) : prev.totalOverdueCount,
        dueTodayCount: wasDueToday ? Math.max(0, prev.dueTodayCount - 1) : prev.dueTodayCount,
      }));
      setLoanForBadDebt(null);
      setBadDebtReason("");
      router.refresh();
    } else {
      alert(res.error ?? "เกิดข้อผิดพลาดในการตัดจำหน่ายหนี้สูญ");
    }
  };

  return (
    <div className="w-full pb-24 md:pb-12">
      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-5">
        {/* Metric Cards Banner with Subtle Ambient Gradients & Micro-Badges */}
        {role === "OWNER" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
            {/* 1. เงินปล่อยในตลาด */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-emerald-50/20 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-bold text-zinc-700">เงินต้นในตลาด</span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60 shadow-2xs">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <p className="mt-2.5 font-mono text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-zinc-900">
                {formatPrivateAmount(metrics.totalPrincipalInMarket, isPrivacy)}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500 font-medium">
                  {activeLoans.length} สัญญากำลังหมุนเวียน
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-[10px] text-emerald-700 border border-emerald-200/70">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  หมุนเวียน
                </span>
              </div>
            </div>

            {/* 2. เงินสดกองกลางคงเหลือ */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-blue-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-bold text-zinc-700">เงินสดกองกลาง</span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/60 shadow-2xs">
                  <Wallet className="size-4" />
                </div>
              </div>
              <p className="mt-2.5 font-mono text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-blue-700">
                {formatPrivateAmount(metrics.cashBalance, isPrivacy)}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-medium">พร้อมเบิกปล่อยกู้</span>
                <button
                  type="button"
                  onClick={() => setIsFundModalOpen(true)}
                  className="min-h-[30px] inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>เติม/ตั้งยอด</span>
                </button>
              </div>
            </div>

            {/* 3. เกินกำหนด */}
            <div className="col-span-2 md:col-span-1 relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/90 via-white to-rose-100/40 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-bold text-rose-900">เกินกำหนดชำระ</span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-300/80 shadow-2xs">
                  <AlertTriangle className="size-4" />
                </div>
              </div>
              <p className="mt-2.5 font-mono text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-rose-700">
                {overdueLoans.length} ราย
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-rose-600/90 font-medium">
                  คิดค่าปรับรายวันอัตโนมัติ
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-extrabold text-[10px] text-rose-800 border border-rose-200">
                  <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
                  ต้องตามด่วน
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Agent View Banner */
          <div className="grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-bold text-amber-900">ยอดต้องเก็บวันนี้</span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-300/80 shadow-2xs">
                  <Clock className="size-4" />
                </div>
              </div>
              <p className="mt-2.5 font-mono text-2xl sm:text-3xl font-black tabular-nums text-amber-800">
                {dueTodayLoans.length} ราย
              </p>
              <span className="mt-1 block text-[11px] text-amber-700 font-medium">รอบตัดดอก / ปิดยอด</span>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/90 via-white to-rose-100/50 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-bold text-rose-900">ต้องตามด่วน (เกินกำหนด)</span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-300/80 shadow-2xs">
                  <AlertTriangle className="size-4" />
                </div>
              </div>
              <p className="mt-2.5 font-mono text-2xl sm:text-3xl font-black tabular-nums text-rose-700">
                {overdueLoans.length} ราย
              </p>
              <span className="mt-1 block text-[11px] text-rose-600 font-medium">มีค่าปรับสะสม</span>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input with Clear Button */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกหนี้, ชื่อเล่น, เบอร์โทร, สถานที่ทำงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-9 text-xs sm:text-sm font-medium text-zinc-900 placeholder-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all duration-200"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
                title="ล้างข้อความค้นหา"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills with Badge Counts & Smooth Transitions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {filterTabs.map((tab) => {
              const isSelected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic("selection");
                    setFilter(tab.id);
                  }}
                  className={`min-h-[40px] flex items-center gap-2 rounded-full px-3.5 py-1.5 font-bold transition-all duration-150 select-none cursor-pointer active:scale-95 shadow-2xs shrink-0 ${
                    isSelected
                      ? "bg-zinc-900 text-white shadow-xs scale-100 ring-2 ring-zinc-900/10"
                      : "bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 hover:-translate-y-0.5"
                  }`}
                >
                  {tab.dot && (
                    <span className={`size-2 rounded-full ${isSelected ? "bg-white" : tab.dot}`} />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isSelected
                        ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                        : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                handleExportCsv();
              }}
              className="min-h-[40px] inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 font-bold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 cursor-pointer text-xs"
              title="ส่งออกรายงานสัญญาเงินกู้เป็น CSV"
            >
              <Download className="size-3.5 text-zinc-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Loan Cards List */}
        <div className="mt-5">
          {filteredLoans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  userRole={role}
                  onPaymentClick={() => {
                    triggerHaptic("medium");
                    setSelectedLoanForPayment(loan);
                  }}
                  onDeleteClick={() => {
                    triggerHaptic("heavy");
                    setLoanToDelete(loan);
                  }}
                  onBadDebtClick={() => {
                    triggerHaptic("heavy");
                    setLoanForBadDebt(loan);
                  }}
                />
              ))}
            </div>
          ) : (
            /* Beautiful Empty State with Reset Trigger */
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-gradient-to-b from-white to-zinc-50/50 p-10 sm:p-14 text-center text-zinc-500 shadow-2xs">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 mb-3 shadow-inner">
                <Layers className="size-7 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">
                {searchTerm ? `ไม่พบสัญญาที่ตรงกับ "${searchTerm}"` : "ไม่พบรายการสัญญาตามเงื่อนไข"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                {filter === "SETTLED"
                  ? "ยังไม่มีสัญญาที่ปิดยอดเสร็จสิ้นในระบบ"
                  : filter === "BAD_DEBT"
                  ? "ไม่มีรายการหนี้สูญในระบบ"
                  : searchTerm
                  ? "ลองตรวจสอบคำสะกด หรือพิมพ์เพียงบางส่วนของชื่อ/เบอร์โทร"
                  : "ไม่มีสัญญาที่ตรงกับแท็บตัวกรองนี้ในขณะนี้"}
              </p>
              {(searchTerm || filter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setFilter("ALL");
                  }}
                  className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>ล้างตัวกรองและดูทั้งหมด</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Repayment Drawer Modal */}
      <RepaymentDrawer
        loan={selectedLoanForPayment}
        isOpen={Boolean(selectedLoanForPayment)}
        onClose={() => setSelectedLoanForPayment(null)}
        onSuccess={handlePaymentSuccess}
        onDeleteRequest={(loan) => setLoanToDelete(loan)}
        userRole={role}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {loanToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setLoanToDelete(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200"
            >
              <div className="flex items-start gap-3.5">
                <div className="size-10 shrink-0 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <Trash2 className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-zinc-900">
                    ยืนยันลบสัญญานี้?
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    คุณต้องการลบสัญญาของ{" "}
                    <strong className="text-zinc-800 font-semibold">{loanToDelete.borrowerName}</strong>{" "}
                    (ยอดเงินต้น {loanToDelete.remainingPrincipal.toLocaleString()} บาท) ใช่หรือไม่? 
                    รายการนี้จะถูกนำออกจากระบบทันที
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-150 pt-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setLoanToDelete(null)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 cursor-pointer min-h-[38px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="min-h-[38px] flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>กำลังลบ...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      <span>ลบสัญญา</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bad Debt Write-Off Confirmation Modal */}
      <AnimatePresence>
        {loanForBadDebt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isWritingOff && setLoanForBadDebt(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-rose-200"
            >
              <div className="flex items-start gap-3.5">
                <div className="size-10 shrink-0 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-zinc-900">
                    ยืนยันตัดจำหน่ายหนี้สูญ (Bad Debt)
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    คุณกำลังจะตัดยอดเงินต้นคงค้าง{" "}
                    <strong className="text-rose-700 font-bold">{loanForBadDebt.remainingPrincipal.toLocaleString()} บาท</strong>{" "}
                    ของ <strong className="text-zinc-900">{loanForBadDebt.borrowerName}</strong> เป็นหนี้สูญ
                  </p>
                </div>
              </div>

              <div className="mt-3.5 rounded-xl bg-rose-50/80 p-3 border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>⚠️ ผลกระทบจากการตัดหนี้สูญ:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                  <li>ปรับสถานะสัญญาเป็น <span className="font-bold">BAD_DEBT</span></li>
                  <li>ปรับเกรดเครดิตผู้กู้เป็น <span className="font-bold text-rose-800">BLACKLIST</span> อัตโนมัติ</li>
                  <li>ลงบัญชีกองกลางเป็นรายจ่ายขาดทุน (WITHDRAWAL)</li>
                </ul>
              </div>

              <div className="mt-3.5">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  หมายเหตุ / เหตุผลการตัดหนี้สูญ:
                </label>
                <input
                  type="text"
                  placeholder="เช่น ลูกหนี้หลบหนี, ติดต่อไม่ได้เกิน 30 วัน"
                  value={badDebtReason}
                  onChange={(e) => setBadDebtReason(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/10"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-150 pt-3">
                <button
                  type="button"
                  disabled={isWritingOff}
                  onClick={() => {
                    setLoanForBadDebt(null);
                    setBadDebtReason("");
                  }}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 cursor-pointer min-h-[38px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isWritingOff}
                  onClick={handleConfirmBadDebt}
                  className="min-h-[38px] flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isWritingOff ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>กำลังตัดหนี้สูญ...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" />
                      <span>ยืนยันตัดหนี้สูญ</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fund Modal (Set / Add Capital) */}
      <FundModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        currentBalance={metrics.cashBalance}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
