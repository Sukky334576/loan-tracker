"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp, 
  Plus, 
  Sliders,
  RotateCcw,
  Download,
  ShieldCheck
} from "lucide-react";
import { FundModal } from "@/components/FundModal";
import { exportToCsv } from "@/lib/export-csv";

export interface LedgerTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface LedgerClientProps {
  transactions: LedgerTransaction[];
  totalInjected: number;
  totalDisbursed: number;
  totalRepaid: number;
  totalWithdrawn: number;
  cashBalance: number;
  userRole?: "OWNER" | "AGENT";
}

export function LedgerClient({
  transactions,
  totalInjected,
  totalDisbursed,
  totalRepaid,
  totalWithdrawn,
  cashBalance,
  userRole = "OWNER",
}: LedgerClientProps) {
  const router = useRouter();
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  const isOwner = userRole === "OWNER";

  const handleExportCsv = () => {
    const headers = ["วันที่-เวลา", "ประเภทธุรกรรม", "คำอธิบาย / รายละเอียด", "จำนวนเงิน (บาท)"];
    const rows = transactions.map((tx) => {
      const isInflow = tx.type === "CAPITAL_INJECTION" || tx.type === "REPAYMENT";
      return [
        new Date(tx.createdAt).toLocaleString("th-TH"),
        tx.type,
        tx.description,
        `${isInflow ? "+" : "-"}${tx.amount}`,
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`ledger-transactions-${dateStr}.csv`, headers, rows);
  };

  return (
    <div className="w-full pb-24 md:pb-12">
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                กระเป๋าเงินกองกลาง & บัญชีเงินสด
              </h2>
              {!isOwner && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  <ShieldCheck className="size-3" />
                  สายตรวจ (Agent)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              ภาพรวมกระแสเงินสดหมุนเวียนและการปล่อยกู้ของนายทุน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-xs transition-all hover:bg-zinc-100 active:scale-95 cursor-pointer"
              title="ส่งออกประวัติการเคลื่อนไหวเป็น CSV"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </button>

            {isOwner && (
              <button
                type="button"
                onClick={() => setIsFundModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-zinc-800 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-95 select-none cursor-pointer"
              >
                <Plus className="size-4 stroke-[2.5]" />
                <span>เติม / ตั้งยอดเงินกองกลาง</span>
              </button>
            )}
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Master Balance & Quick Stats */}
          <div className="flex flex-col gap-3.5 lg:col-span-1">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
                <span>เงินสดกองกลางพร้อมใช้ (Cash Reserve)</span>
                <Wallet className="size-4 text-emerald-600" />
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums text-zinc-900">
                    {cashBalance.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-zinc-400">บาท</span>
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setIsFundModalOpen(true)}
                    className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    ปรับยอด
                  </button>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-zinc-150 pt-3 text-xs">
                <div>
                  <span className="text-zinc-500 text-[11px]">เงินทุนตั้งต้น</span>
                  <p className="font-mono font-bold tabular-nums text-zinc-800 text-sm mt-0.5">
                    {totalInjected.toLocaleString()} ฿
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 text-[11px]">ยอดปล่อยกู้สะสม</span>
                  <p className="font-mono font-bold tabular-nums text-rose-700 text-sm mt-0.5">
                    -{totalDisbursed.toLocaleString()} ฿
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-xs shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-zinc-300">
              <div className="flex items-center gap-2 text-zinc-700 font-semibold mb-2">
                <TrendingUp className="size-4 text-emerald-600" />
                <span>บัญชีหลักสำหรับรับเงินโอน</span>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/60 font-mono text-xs">
                <p className="font-bold text-zinc-900">ธนาคารกรุงเทพ (BBL)</p>
                <p className="text-blue-700 font-bold text-sm mt-0.5">546-7-396726</p>
                <p className="text-zinc-600 font-sans text-[11px] mt-0.5">น.ส.ฟิลิปดา ฤือปัญญา</p>
              </div>
            </div>
          </div>

          {/* Right Column: Transactions List */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  ประวัติการเคลื่อนไหวล่าสุด ({transactions.length} รายการ)
                </h3>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setIsFundModalOpen(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    + เติมเงิน
                  </button>
                )}
              </div>

              {transactions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {transactions.map((tx) => {
                    const isInflow =
                      tx.type === "CAPITAL_INJECTION" || tx.type === "REPAYMENT";
                    const dateStr = new Date(tx.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-150 bg-zinc-50/70 p-3 transition-all duration-150 hover:bg-white hover:border-zinc-300 hover:shadow-2xs hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                              isInflow
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isInflow ? (
                              <ArrowDownRight className="size-4" />
                            ) : (
                              <ArrowUpRight className="size-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-800 truncate max-w-[200px] sm:max-w-md">
                              {tx.description}
                            </p>
                            <span className="text-[10px] text-zinc-400">{dateStr}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`font-mono text-xs font-bold tabular-nums ${
                              isInflow ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isInflow ? "+" : "-"}
                            {tx.amount.toLocaleString()} ฿
                          </p>
                          <span className="text-[9px] font-semibold text-zinc-400 uppercase">
                            {tx.type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400">
                  ยังไม่มีประวัติการเคลื่อนไหวกองกลาง
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Fund Modal (Only openable by Owner) */}
      {isOwner && (
        <FundModal
          isOpen={isFundModalOpen}
          onClose={() => setIsFundModalOpen(false)}
          currentBalance={cashBalance}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
