"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp, 
  Plus, 
  Download,
  ShieldCheck,
  UserCheck,
  DollarSign,
  Receipt,
  AlertTriangle,
  FileText,
  Calculator,
  Activity,
  History,
  CheckCircle2,
  Calendar,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { FundModal } from "@/components/FundModal";
import { exportToCsv } from "@/lib/export-csv";
import { usePrivacyMode, formatPrivateAmount } from "@/lib/privacy";

export interface LedgerTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface PnLMetrics {
  principalRecovered: number;
  interestProfit: number;
  lateFeeIncome: number;
  badDebtLoss: number;
  netProfit: number;
}

export interface AgentPerformance {
  username: string;
  name: string;
  role: string;
  loansCreatedCount: number;
  totalDisbursed: number;
  paymentsCollectedCount: number;
  totalCollected: number;
  principalCollected: number;
  interestCollected: number;
  penaltyCollected: number;
}

export interface AuditLogItem {
  id: string;
  actor: string;
  action: string;
  targetId: string;
  details: string;
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
  pnlMetrics?: PnLMetrics;
  agentPerformances?: AgentPerformance[];
  auditLogs?: AuditLogItem[];
}

export function LedgerClient({
  transactions,
  totalInjected,
  totalDisbursed,
  totalRepaid,
  totalWithdrawn,
  cashBalance,
  userRole = "OWNER",
  pnlMetrics = {
    principalRecovered: 0,
    interestProfit: 0,
    lateFeeIncome: 0,
    badDebtLoss: 0,
    netProfit: 0,
  },
  agentPerformances = [],
  auditLogs = [],
}: LedgerClientProps) {
  const router = useRouter();
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PERFORMANCE" | "TRANSACTIONS" | "AUDIT">("OVERVIEW");
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [auditFilter, setAuditFilter] = useState<string>("ALL");

  const { isPrivacy, togglePrivacy } = usePrivacyMode();
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

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilter === "ALL") return true;
    if (auditFilter === "LOGIN") return log.action === "LOGIN";
    if (auditFilter === "LOAN") return log.action.startsWith("LOAN");
    if (auditFilter === "PAYMENT") return log.action.startsWith("PAYMENT");
    if (auditFilter === "BORROWER") return log.action.startsWith("BORROWER");
    if (auditFilter === "LEDGER") return log.action === "LEDGER_ADJUST" || log.action === "DB_RESET";
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action === "LOGIN") {
      return <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">LOGIN</span>;
    }
    if (action.includes("BAD_DEBT")) {
      return <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">หนี้สูญ</span>;
    }
    if (action.includes("CREATE")) {
      return <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">สร้าง</span>;
    }
    if (action.includes("UPDATE")) {
      return <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">แก้ไข</span>;
    }
    if (action.includes("PAYMENT")) {
      return <span className="rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700">รับชำระ</span>;
    }
    if (action.includes("LEDGER") || action.includes("RESET")) {
      return <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">กองกลาง</span>;
    }
    return <span className="rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700">{action}</span>;
  };

  const renderDetails = (details: string) => {
    try {
      const obj = JSON.parse(details);
      if (typeof obj === "object" && obj !== null) {
        return (
          <div className="flex flex-wrap gap-1 text-[11px] text-zinc-600">
            {Object.entries(obj).map(([key, val]) => (
              <span key={key} className="inline-flex items-center gap-0.5 bg-zinc-100/80 px-1.5 py-0.5 rounded text-[10px]">
                <strong className="text-zinc-500 font-medium">{key}:</strong> {String(val)}
              </span>
            ))}
          </div>
        );
      }
    } catch {
      // not JSON
    }
    return <span className="text-[11px] text-zinc-600">{details}</span>;
  };

  return (
    <div className="w-full pb-24 md:pb-12">
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                บัญชีกองกลาง & วิเคราะห์ผลประกอบการ
              </h2>
              {!isOwner && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  <ShieldCheck className="size-3" />
                  สายตรวจ (Agent)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              ติดตามกระแสเงินสด วิเคราะห์กำไร-ขาดทุน และผลงานทีมงานแบบเรียลไทม์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Privacy Toggle */}
            <button
              type="button"
              onClick={togglePrivacy}
              title={isPrivacy ? "ปิดโหมดซ่อนยอดเงิน" : "เปิดโหมดซ่อนยอดเงิน"}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer ${
                isPrivacy
                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {isPrivacy ? <EyeOff className="size-3.5 text-amber-600" /> : <Eye className="size-3.5 text-zinc-500" />}
              <span>{isPrivacy ? "โหมดส่วนตัว (ON)" : "ซ่อนยอดเงิน"}</span>
            </button>

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

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-200/90 pb-2 mb-5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
              activeTab === "OVERVIEW"
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Activity className="size-3.5" />
            <span>ภาพรวม & งบกำไร-ขาดทุน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PERFORMANCE")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
              activeTab === "PERFORMANCE"
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Calculator className="size-3.5" />
            <span>ผลงานทีมงาน & ค่าคอมมิชชัน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TRANSACTIONS")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
              activeTab === "TRANSACTIONS"
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <History className="size-3.5" />
            <span>ประวัติกองกลาง ({transactions.length})</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab("AUDIT")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer ${
                activeTab === "AUDIT"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              <Lock className="size-3.5" />
              <span>ประวัติการทำงาน (Audit Log)</span>
            </button>
          )}
        </div>

        {/* Tab 1: OVERVIEW & P&L */}
        {activeTab === "OVERVIEW" && (
          <div className="flex flex-col gap-5">
            {/* Master Cash Reserve Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all hover:border-zinc-300">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-emerald-600" />
                    <span>เงินสดกองกลางพร้อมใช้ (Cash Reserve)</span>
                  </div>
                  {isPrivacy && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                      ซ่อนยอดเงินอยู่
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-zinc-900">
                      {formatPrivateAmount(cashBalance, isPrivacy, "")}
                    </span>
                    {!isPrivacy && <span className="text-sm font-semibold text-zinc-400">บาท</span>}
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsFundModalOpen(true)}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      ปรับยอดกองกลาง
                    </button>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-zinc-150 pt-3 text-xs">
                  <div>
                    <span className="text-zinc-400 text-[11px]">เงินทุนตั้งต้น</span>
                    <p className="font-mono font-bold tabular-nums text-zinc-800 text-sm mt-0.5">
                      {formatPrivateAmount(totalInjected, isPrivacy)}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px]">ยอดปล่อยกู้สะสม</span>
                    <p className="font-mono font-bold tabular-nums text-rose-700 text-sm mt-0.5">
                      {formatPrivateAmount(-totalDisbursed, isPrivacy)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 text-[11px]">ยอดรับคืนสะสม</span>
                    <p className="font-mono font-bold tabular-nums text-emerald-700 text-sm mt-0.5">
                      {formatPrivateAmount(totalRepaid, isPrivacy)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Bank Account Box */}
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 text-xs shadow-xs transition-all hover:border-zinc-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-700 font-semibold mb-2">
                    <TrendingUp className="size-4 text-emerald-600" />
                    <span>บัญชีหลักสำหรับรับเงินโอน</span>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3.5 border border-zinc-200/60 font-mono text-xs">
                    <p className="font-bold text-zinc-900">ธนาคารกรุงเทพ (BBL)</p>
                    <p className="text-blue-700 font-bold text-base mt-0.5 tracking-wide">546-7-396726</p>
                    <p className="text-zinc-600 font-sans text-xs mt-1">น.ส.ฟิลิปดา ฤือปัญญา</p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 mt-3">
                  ใช้เป็นบัญชีปลายทางในข้อความแจ้งยอดชำระเงินส่ง LINE อัตโนมัติ
                </p>
              </div>
            </div>

            {/* 4 P&L Analytics Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  งบกำไร-ขาดทุน & ผลประกอบการสะสม (Profit & Loss Summary)
                </h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Principal Recovered */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
                    <span>เงินต้นที่ได้รับคืนสะสม</span>
                    <Receipt className="size-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-emerald-800">
                    {formatPrivateAmount(pnlMetrics.principalRecovered, isPrivacy)}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 mt-1">
                    หมุนกลับเข้ากองกลางจากการตัดต้น & ปิดสัญญา
                  </p>
                </div>

                {/* 2. Interest Profit */}
                <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-center justify-between text-blue-800 text-xs font-semibold">
                    <span>กำไรดอกเบี้ยรับสะสม</span>
                    <DollarSign className="size-4 text-blue-600" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-blue-800">
                    {formatPrivateAmount(pnlMetrics.interestProfit, isPrivacy)}
                  </p>
                  <p className="text-[11px] text-blue-700/80 mt-1">
                    ดอกเบี้ยหักล่วงหน้า + ดอกเบี้ยต่อรอบสัญญา
                  </p>
                </div>

                {/* 3. Late Fee Income */}
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
                    <span>รายได้ค่าปรับล่าช้า</span>
                    <AlertTriangle className="size-4 text-amber-600" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums text-amber-800">
                    {formatPrivateAmount(pnlMetrics.lateFeeIncome, isPrivacy)}
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-1">
                    ค่าปรับรายวันสะสมที่เรียกเก็บได้จริง
                  </p>
                </div>

                {/* 4. Net Profit */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900 text-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center justify-between text-zinc-300 text-xs font-semibold">
                    <span>กำไรสุทธิรวม (Net Profit)</span>
                    <TrendingUp className="size-4 text-emerald-400" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-extrabold tracking-tight tabular-nums text-emerald-400">
                    {formatPrivateAmount(pnlMetrics.netProfit, isPrivacy)}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>(ดอกเบี้ย + ค่าปรับ) - หนี้สูญ</span>
                    {pnlMetrics.badDebtLoss > 0 && (
                      <span className="text-rose-400 font-bold">
                        ตัดสูญ -{pnlMetrics.badDebtLoss.toLocaleString()} ฿
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AGENT PERFORMANCE & COMMISSION */}
        {activeTab === "PERFORMANCE" && (
          <div className="flex flex-col gap-5">
            {/* Commission Settings Box */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <Calculator className="size-4 text-blue-600" />
                    เครื่องคำนวณส่วนแบ่งค่าคอมมิชชันสายตรวจ (Commission Calculator)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    คำนวณค่าคอมมิชชันอัตโนมัติตามยอดดอกเบี้ยที่สายตรวจเก็บได้สำเร็จ
                  </p>
                </div>

                {/* Commission Percentage Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600">อัตราคอมมิชชัน:</span>
                  <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                    {[5, 10, 15, 20].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setCommissionRate(rate)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          commissionRate === rate
                            ? "bg-white text-zinc-900 shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 border border-zinc-200 rounded-xl px-2 py-1 bg-white">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-12 text-xs font-mono font-bold text-center focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Cards for Each Team Member */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agentPerformances.map((perf) => {
                const commissionPayable = Math.round(perf.interestCollected * (commissionRate / 100));
                const isAgent = perf.role === "AGENT";

                return (
                  <div
                    key={perf.username}
                    className={`rounded-2xl border p-5 shadow-xs transition-all hover:shadow-sm ${
                      isAgent
                        ? "border-blue-200 bg-blue-50/20"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex size-9 items-center justify-center rounded-xl font-bold text-xs ${
                          isAgent ? "bg-blue-600 text-white" : "bg-zinc-900 text-white"
                        }`}>
                          {perf.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{perf.name} ({perf.username})</p>
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase">
                            {isAgent ? "สายตรวจภาคสนาม (Field Agent)" : "นายทุน / เจ้าของระบบ (Owner)"}
                          </span>
                        </div>
                      </div>

                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        isAgent
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        {perf.role}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-white p-3 border border-zinc-150">
                        <span className="text-zinc-500 text-[11px]">เปิดสัญญาใหม่</span>
                        <p className="font-mono text-base font-bold text-zinc-900 mt-0.5">
                          {perf.loansCreatedCount} สัญญา
                        </p>
                        <span className="text-[10px] text-zinc-400">
                          วงเงินปล่อย: {formatPrivateAmount(perf.totalDisbursed, isPrivacy)}
                        </span>
                      </div>

                      <div className="rounded-xl bg-white p-3 border border-zinc-150">
                        <span className="text-zinc-500 text-[11px]">รับชำระเงินสำเร็จ</span>
                        <p className="font-mono text-base font-bold text-emerald-700 mt-0.5">
                          {perf.paymentsCollectedCount} ครั้ง
                        </p>
                        <span className="text-[10px] text-zinc-400">
                          ยอดรวม: {formatPrivateAmount(perf.totalCollected, isPrivacy)}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown of Collected Funds */}
                    <div className="mt-3 rounded-xl bg-zinc-50 p-3 border border-zinc-150 text-xs">
                      <div className="flex justify-between py-0.5">
                        <span className="text-zinc-500">เงินต้นที่เก็บได้:</span>
                        <span className="font-mono font-semibold text-zinc-800">
                          {formatPrivateAmount(perf.principalCollected, isPrivacy)}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-zinc-500">ดอกเบี้ยที่เก็บได้:</span>
                        <span className="font-mono font-semibold text-blue-700">
                          {formatPrivateAmount(perf.interestCollected, isPrivacy)}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-zinc-500">ค่าปรับที่เก็บได้:</span>
                        <span className="font-mono font-semibold text-amber-700">
                          {formatPrivateAmount(perf.penaltyCollected, isPrivacy)}
                        </span>
                      </div>
                    </div>

                    {/* Commission Box (Especially for Agent) */}
                    {isAgent && (
                      <div className="mt-4 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-3.5 text-white shadow-xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
                          <span>ค่าคอมมิชชันที่ต้องจ่าย ({commissionRate}%)</span>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                            คำนวณจากดอกเบี้ย
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="font-mono text-2xl font-extrabold tracking-tight tabular-nums">
                            {formatPrivateAmount(commissionPayable, isPrivacy, " บาท")}
                          </span>
                          <span className="text-[11px] text-blue-200">
                            (จากดอก {perf.interestCollected.toLocaleString()} ฿)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: TRANSACTIONS LIST */}
        {activeTab === "TRANSACTIONS" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                ประวัติการเคลื่อนไหวเงินกองกลาง ({transactions.length} รายการล่าสุด)
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
                  const isInflow = tx.type === "CAPITAL_INJECTION" || tx.type === "REPAYMENT";
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
                          {formatPrivateAmount(tx.amount, isPrivacy)}
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
        )}

        {/* Tab 4: SYSTEM AUDIT LOG */}
        {activeTab === "AUDIT" && isOwner && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  บันทึกประวัติการใช้งานระบบ (System Audit Log)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  เก็บบันทึกทุกการกระทำสำคัญ เช่น การเข้าสู่ระบบ สร้างสัญญา ตัดหนี้สูญ และปรับยอดกองกลาง
                </p>
              </div>

              {/* Audit Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: "ALL", label: "ทั้งหมด" },
                  { id: "LOGIN", label: "เข้าสู่ระบบ" },
                  { id: "LOAN", label: "สัญญาเงินกู้" },
                  { id: "PAYMENT", label: "รับชำระ" },
                  { id: "BORROWER", label: "ลูกหนี้" },
                  { id: "LEDGER", label: "กองกลาง" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAuditFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      auditFilter === f.id
                        ? "bg-zinc-900 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAuditLogs.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filteredAuditLogs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString("th-TH", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={log.id}
                      className="rounded-xl border border-zinc-150 bg-zinc-50/70 p-3 transition-all hover:bg-white hover:border-zinc-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          <span className="text-xs font-bold text-zinc-800">
                            {log.actor}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            [{log.targetId}]
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400">{dateStr}</span>
                      </div>

                      <div className="mt-2 text-xs">
                        {renderDetails(log.details)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400">
                ไม่พบประวัติการใช้งานตามเงื่อนไขที่เลือก
              </div>
            )}
          </div>
        )}
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
