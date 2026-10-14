"use client";

import React, { useState } from "react";
import { useRole } from "@/components/AppShell";
import { LoanCard, LoanCardData } from "@/components/LoanCard";
import { RepaymentDrawer } from "@/components/RepaymentDrawer";
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Wallet, 
  Layers, 
  Search
} from "lucide-react";

interface DashboardClientProps {
  initialLoans: LoanCardData[];
  initialMetrics: {
    totalPrincipalInMarket: number;
    totalOverdueCount: number;
    dueTodayCount: number;
    cashBalance: number;
    activeLoansCount: number;
  };
}

export function DashboardClient({
  initialLoans,
  initialMetrics,
}: DashboardClientProps) {
  const { role } = useRole();
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "OVERDUE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selected Loan for Repayment Drawer
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanCardData | null>(null);

  const filteredLoans = initialLoans.filter((loan) => {
    const matchesSearch =
      loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.phone.includes(searchTerm) ||
      (loan.workplace && loan.workplace.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === "TODAY") {
      return loan.daysDiff === 0;
    }
    if (filter === "OVERDUE") {
      return loan.status === "OVERDUE" || loan.daysDiff < 0;
    }
    return true;
  });

  const filterTabs = [
    { id: "ALL" as const, label: `ทั้งหมด (${initialLoans.length})` },
    { id: "TODAY" as const, label: `ต้องเก็บวันนี้ (${initialMetrics.dueTodayCount})`, dot: "bg-amber-500" },
    { id: "OVERDUE" as const, label: `เกินกำหนด (${initialMetrics.totalOverdueCount})`, dot: "bg-rose-600" },
  ];

  return (
    <div className="w-full pb-24 md:pb-12">
      {/* Main Content Area: Responsive Container */}
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
                {initialMetrics.totalPrincipalInMarket.toLocaleString()} ฿
              </p>
              <span className="text-[11px] text-zinc-400">
                {initialMetrics.activeLoansCount} สัญญากำลังหมุนเวียน
              </span>
            </div>

            {/* เงินสดคงเหลือในมือ */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold">เงินสดกองกลางคงเหลือ</span>
                <Wallet className="size-4 text-blue-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-blue-700">
                {initialMetrics.cashBalance.toLocaleString()} ฿
              </p>
              <span className="text-[11px] text-zinc-400">พร้อมเบิกปล่อยกู้</span>
            </div>

            {/* เกินกำหนด */}
            <div className="col-span-2 md:col-span-1 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-semibold">เกินกำหนดชำระ</span>
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-rose-700">
                {initialMetrics.totalOverdueCount} ราย
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
                {initialMetrics.dueTodayCount} ราย
              </p>
              <span className="text-[11px] text-amber-700/80">รอบตัดดอก / ปิดยอด</span>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 transition-all duration-200 cursor-default">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-semibold">ต้องตามด่วน (เกินกำหนด)</span>
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-rose-700">
                {initialMetrics.totalOverdueCount} ราย
              </p>
              <span className="text-[11px] text-rose-600/80">มีค่าปรับสะสม</span>
            </div>
          </div>
        )}

        {/* Search & Filter Bar: Responsive Row */}
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
          </div>
        </div>

        {/* Loan Cards List: Responsive Grid */}
        <div className="mt-4">
          {filteredLoans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onPaymentClick={() => setSelectedLoanForPayment(loan)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500 shadow-xs">
              <Layers className="size-10 text-zinc-400 mb-3 stroke-[1.5]" />
              <p className="text-sm font-bold text-zinc-800">ไม่พบรายการสัญญาตามเงื่อนไข</p>
              <p className="text-xs text-zinc-400 mt-1">ลองค้นหาด้วยคำอื่นหรือกดดูทั้งหมด</p>
            </div>
          )}
        </div>
      </main>

      {/* Repayment Drawer Modal */}
      <RepaymentDrawer
        loan={selectedLoanForPayment}
        isOpen={Boolean(selectedLoanForPayment)}
        onClose={() => setSelectedLoanForPayment(null)}
        onSuccess={() => setSelectedLoanForPayment(null)}
      />
    </div>
  );
}
