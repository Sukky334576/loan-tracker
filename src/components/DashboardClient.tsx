"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/AppShell";
import { LoanCard, LoanCardData } from "@/components/LoanCard";
import { RepaymentDrawer, PaymentSuccessResult } from "@/components/RepaymentDrawer";
import { FundModal } from "@/components/FundModal";
import { deleteLoanAction } from "@/app/actions/loans";
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
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { exportToCsv } from "@/lib/export-csv";
import { usePrivacyMode, formatPrivateAmount } from "@/lib/privacy";

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
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "OVERDUE" | "SETTLED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selected Loan for Repayment Drawer
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanCardData | null>(null);

  // Fund Modal (Set / Add Capital)
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  // Loan to Delete (Confirmation Modal)
  const [loanToDelete, setLoanToDelete] = useState<LoanCardData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state if server props change
  useEffect(() => {
    setLoans(initialLoans);
    setMetrics(initialMetrics);
  }, [initialLoans, initialMetrics]);

  // Active vs Settled Loans
  const activeLoans = loans.filter((l) => l.status !== "SETTLED" && l.status !== "BAD_DEBT");
  const settledLoans = loans.filter((l) => l.status === "SETTLED");
  const dueTodayLoans = activeLoans.filter((l) => l.daysDiff === 0);
  const overdueLoans = activeLoans.filter((l) => l.status === "OVERDUE" || l.daysDiff < 0);

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.phone.includes(searchTerm) ||
      (loan.workplace && loan.workplace.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === "ALL") {
      // On "ALL", show active loans first
      return loan.status !== "SETTLED";
    }
    if (filter === "TODAY") {
      return loan.status !== "SETTLED" && loan.daysDiff === 0;
    }
    if (filter === "OVERDUE") {
      return loan.status !== "SETTLED" && (loan.status === "OVERDUE" || loan.daysDiff < 0);
    }
    if (filter === "SETTLED") {
      return loan.status === "SETTLED";
    }
    return true;
  });

  const filterTabs = [
    { id: "ALL" as const, label: `กำลังกู้ (${activeLoans.length})` },
    { id: "TODAY" as const, label: `ต้องเก็บวันนี้ (${dueTodayLoans.length})`, dot: "bg-amber-500" },
    { id: "OVERDUE" as const, label: `เกินกำหนด (${overdueLoans.length})`, dot: "bg-rose-600" },
    { id: "SETTLED" as const, label: `ปิดยอดแล้ว (${settledLoans.length})`, dot: "bg-emerald-500" },
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
      setLoans((prev) =>
        prev.map((l) =>
          l.id === result.loanId
            ? {
                ...l,
                remainingPrincipal: result.remainingPrincipal,
                penaltyAccrued: 0,
                accruedInterest: 0,
              }
            : l
        )
      );
      setMetrics((prev) => ({
        ...prev,
        totalPrincipalInMarket: Math.max(0, prev.totalPrincipalInMarket - cut),
        cashBalance: prev.cashBalance + result.amountPaid,
      }));
    } else {
      // Interest only
      setLoans((prev) =>
        prev.map((l) =>
          l.id === result.loanId
            ? {
                ...l,
                rolloverCount: l.rolloverCount + 1,
                penaltyAccrued: 0,
                accruedInterest: 0,
                daysDiff: l.termType === "DAYS_7" ? 7 : 10,
                status: "ACTIVE",
              }
            : l
        )
      );
      setMetrics((prev) => ({
        ...prev,
        cashBalance: prev.cashBalance + result.amountPaid,
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
      // Optimistically remove from state
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

  return (
    <div className="w-full pb-24 md:pb-12">
      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-5">
        {/* Metric Cards Banner */}
        {role === "OWNER" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
            {/* เงินปล่อยในตลาด */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold">เงินต้นหมุนเวียนในตลาด</span>
                <TrendingUp className="size-4 text-emerald-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-zinc-900">
                {formatPrivateAmount(metrics.totalPrincipalInMarket, isPrivacy)}
              </p>
              <span className="text-[11px] text-zinc-400">
                {activeLoans.length} สัญญากำลังหมุนเวียน
              </span>
            </div>

            {/* เงินสดคงเหลือในมือ */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold">เงินสดกองกลางคงเหลือ</span>
                <Wallet className="size-4 text-blue-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-blue-700">
                {formatPrivateAmount(metrics.cashBalance, isPrivacy)}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">พร้อมเบิกปล่อยกู้</span>
                <button
                  type="button"
                  onClick={() => setIsFundModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <span>เติม/ตั้งยอด</span>
                </button>
              </div>
            </div>

            {/* เกินกำหนด */}
            <div className="col-span-2 md:col-span-1 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-semibold">เกินกำหนดชำระ</span>
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-rose-700">
                {overdueLoans.length} ราย
              </p>
              <span className="text-[11px] text-rose-600/80">
                คิดค่าปรับรายวันอัตโนมัติ
              </span>
            </div>
          </div>
        ) : (
          /* Agent View Banner */
          <div className="grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-semibold">ยอดต้องเก็บวันนี้</span>
                <Clock className="size-4 text-amber-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-800">
                {dueTodayLoans.length} ราย
              </p>
              <span className="text-[11px] text-amber-700/80">รอบตัดดอก / ปิดยอด</span>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-semibold">ต้องตามด่วน (เกินกำหนด)</span>
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-rose-700">
                {overdueLoans.length} ราย
              </p>
              <span className="text-[11px] text-rose-600/80">มีค่าปรับสะสม</span>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกหนี้, เบอร์โทร, สถานที่ทำงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-xs font-medium text-zinc-900 placeholder-zinc-400 hover:border-zinc-300 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 shadow-2xs transition-all duration-200"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {filterTabs.map((tab) => {
              const isSelected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold transition-all duration-150 select-none cursor-pointer active:scale-95 shadow-2xs ${
                    isSelected
                      ? "bg-zinc-900 text-white shadow-xs scale-100"
                      : "bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:bg-zinc-100/80 hover:border-zinc-300 hover:-translate-y-0.5"
                  }`}
                >
                  {tab.dot && (
                    <span className={`size-1.5 rounded-full ${isSelected ? "bg-white" : tab.dot}`} />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-100 active:scale-95 cursor-pointer text-xs"
              title="ส่งออกรายงานสัญญาเงินกู้เป็น CSV"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Loan Cards List */}
        <div className="mt-4">
          {filteredLoans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onPaymentClick={() => setSelectedLoanForPayment(loan)}
                  onDeleteClick={() => setLoanToDelete(loan)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500 shadow-xs">
              <Layers className="size-10 text-zinc-400 mb-3 stroke-[1.5]" />
              <p className="text-sm font-bold text-zinc-800">ไม่พบรายการสัญญาตามเงื่อนไข</p>
              <p className="text-xs text-zinc-400 mt-1">
                {filter === "SETTLED" ? "ยังไม่มีสัญญาที่ปิดยอดแล้ว" : "ลองค้นหาด้วยคำอื่นหรือกดดูทั้งหมด"}
              </p>
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
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
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
