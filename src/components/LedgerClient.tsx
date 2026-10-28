"use client";

import React, { useState, useMemo } from "react";
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
  EyeOff,
  ChevronDown,
  ChevronUp,
  Filter,
  BarChart3,
  Layers
} from "lucide-react";
import { FundModal } from "@/components/FundModal";
import { exportToCsv } from "@/lib/export-csv";
import { usePrivacyMode, formatPrivateAmount } from "@/lib/privacy";
import { triggerHaptic } from "@/lib/haptics";
import { recordAuditLogAction } from "@/app/actions/audit";

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

interface MonthlyGroup {
  key: string; // YYYY-MM
  label: string; // e.g. "ตุลาคม 2569"
  totalInjected: number;
  totalRepaid: number;
  totalDisbursed: number;
  totalWithdrawn: number;
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
  transactions: LedgerTransaction[];
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

  // Date filter & view mode states
  const [dateFilterPreset, setDateFilterPreset] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH" | "LAST_30_DAYS" | "CUSTOM">("ALL");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [txTypeFilter, setTxTypeFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [viewMode, setViewMode] = useState<"TIMELINE" | "MONTHLY_GROUPED">("TIMELINE");
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const { isPrivacy, togglePrivacy } = usePrivacyMode();
  const isOwner = userRole === "OWNER";

  const toggleMonth = (monthKey: string) => {
    triggerHaptic("selection");
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // Filtered transactions based on date-range and type
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return transactions.filter((tx) => {
      const txDate = new Date(tx.createdAt);

      if (dateFilterPreset === "THIS_MONTH") {
        if (txDate < startOfThisMonth) return false;
      } else if (dateFilterPreset === "LAST_MONTH") {
        if (txDate < startOfLastMonth || txDate > endOfLastMonth) return false;
      } else if (dateFilterPreset === "LAST_30_DAYS") {
        if (txDate < thirtyDaysAgo) return false;
      } else if (dateFilterPreset === "CUSTOM") {
        if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00`);
          if (txDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59.999`);
          if (txDate > end) return false;
        }
      }

      const isInflow = tx.type === "CAPITAL_INJECTION" || tx.type === "REPAYMENT";
      if (txTypeFilter === "INFLOW" && !isInflow) return false;
      if (txTypeFilter === "OUTFLOW" && isInflow) return false;

      return true;
    });
  }, [transactions, dateFilterPreset, customStartDate, customEndDate, txTypeFilter]);

  // Range metrics
  const rangeMetrics = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === "CAPITAL_INJECTION" || tx.type === "REPAYMENT") {
        inflow += tx.amount;
      } else {
        outflow += tx.amount;
      }
    });
    return {
      inflow,
      outflow,
      net: inflow - outflow,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Monthly Grouped Data
  const monthlyGroups: MonthlyGroup[] = useMemo(() => {
    const map = new Map<string, MonthlyGroup>();
    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const thaiYear = d.getFullYear() + 543;
      const label = `${monthNames[d.getMonth()]} ${thaiYear}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          totalInjected: 0,
          totalRepaid: 0,
          totalDisbursed: 0,
          totalWithdrawn: 0,
          totalInflow: 0,
          totalOutflow: 0,
          netBalance: 0,
          transactions: [],
        });
      }

      const grp = map.get(key)!;
      grp.transactions.push(tx);

      if (tx.type === "CAPITAL_INJECTION") grp.totalInjected += tx.amount;
      if (tx.type === "REPAYMENT") grp.totalRepaid += tx.amount;
      if (tx.type === "DISBURSEMENT") grp.totalDisbursed += tx.amount;
      if (tx.type === "WITHDRAWAL") grp.totalWithdrawn += tx.amount;

      grp.totalInflow = grp.totalInjected + grp.totalRepaid;
      grp.totalOutflow = grp.totalDisbursed + grp.totalWithdrawn;
      grp.netBalance = grp.totalInflow - grp.totalOutflow;
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredTransactions]);

  // CSV Export: Filtered Transactions
  const handleExportFilteredCsv = async () => {
    triggerHaptic("light");
    const headers = ["วันที่-เวลา", "ประเภทธุรกรรม", "คำอธิบาย / รายละเอียด", "เงินเข้า (+)", "เงินออก (-)", "จำนวนเงิน (บาท)"];
    const rows = filteredTransactions.map((tx) => {
      const isInflow = tx.type === "CAPITAL_INJECTION" || tx.type === "REPAYMENT";
      return [
        new Date(tx.createdAt).toLocaleString("th-TH"),
        tx.type,
        tx.description,
        isInflow ? tx.amount : "",
        !isInflow ? tx.amount : "",
        `${isInflow ? "+" : "-"}${tx.amount}`,
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`ledger-transactions-${dateStr}.csv`, headers, rows);

    await recordAuditLogAction("EXPORT_DATA", "LEDGER", {
      type: "FILTERED_TRANSACTIONS_CSV",
      count: filteredTransactions.length,
      dateFilterPreset,
      customStartDate: customStartDate || null,
      customEndDate: customEndDate || null,
    }).catch(() => {});
  };

  // CSV Export: Monthly Summary Report
  const handleExportMonthlyReportCsv = async () => {
    triggerHaptic("light");
    const headers = [
      "เดือน/ปี",
      "เติมทุนเข้า (+)",
      "รับชำระเงิน (+)",
      "เงินเข้ารวม (+)",
      "ปล่อยกู้ (-)",
      "ถอนทุน/หนี้สูญ (-)",
      "เงินออกรวม (-)",
      "กระแสเงินสดสุทธิ (Net Flow)",
      "จำนวนรายการ",
    ];

    const rows = monthlyGroups.map((grp) => [
      grp.label,
      grp.totalInjected,
      grp.totalRepaid,
      grp.totalInflow,
      grp.totalDisbursed,
      grp.totalWithdrawn,
      grp.totalOutflow,
      grp.netBalance,
      grp.transactions.length,
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`monthly-ledger-report-${dateStr}.csv`, headers, rows);

    await recordAuditLogAction("EXPORT_DATA", "LEDGER", {
      type: "MONTHLY_SUMMARY_REPORT_CSV",
      monthsCount: monthlyGroups.length,
    }).catch(() => {});
  };

  // Audit Log Filter
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilter === "ALL") return true;
    if (auditFilter === "LOGIN") return log.action === "LOGIN" || log.action === "LOGOUT";
    if (auditFilter === "LOAN") return log.action.startsWith("LOAN") || log.action.includes("CONTRACT");
    if (auditFilter === "PAYMENT") return log.action.startsWith("PAYMENT");
    if (auditFilter === "BORROWER") return log.action.startsWith("BORROWER");
    if (auditFilter === "LEDGER") return log.action === "LEDGER_ADJUST" || log.action === "DB_RESET";
    if (auditFilter === "EXPORT") return log.action === "EXPORT_DATA" || log.action === "THERMAL_PRINT";
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action === "LOGIN") {
      return <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">เข้าสู่ระบบ</span>;
    }
    if (action === "LOGOUT") {
      return <span className="rounded-md bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-[10px] font-bold text-zinc-600">ออกจากระบบ</span>;
    }
    if (action === "CONTRACT_SIGN") {
      return <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">เซ็นสัญญา</span>;
    }
    if (action === "CONTRACT_CLEAR_SIGN") {
      return <span className="rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">ลบลายเซ็น</span>;
    }
    if (action.includes("BAD_DEBT")) {
      return <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">หนี้สูญ</span>;
    }
    if (action === "LOAN_CREATE") {
      return <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">เปิดสัญญา</span>;
    }
    if (action === "LOAN_DELETE") {
      return <span className="rounded-md bg-rose-50 border border-rose-300 px-2 py-0.5 text-[10px] font-bold text-rose-700">ลบสัญญา</span>;
    }
    if (action === "BORROWER_CREATE") {
      return <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">สร้างลูกหนี้</span>;
    }
    if (action === "BORROWER_UPDATE") {
      return <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">แก้ไขลูกหนี้</span>;
    }
    if (action === "BORROWER_DELETE") {
      return <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">ลบลูกหนี้</span>;
    }
    if (action.includes("PAYMENT")) {
      return <span className="rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700">รับชำระ</span>;
    }
    if (action.includes("LEDGER") || action.includes("RESET")) {
      return <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">กองกลาง</span>;
    }
    if (action === "THERMAL_PRINT") {
      return <span className="rounded-md bg-sky-50 border border-sky-300 px-2 py-0.5 text-[10px] font-bold text-sky-700">พิมพ์สลิป</span>;
    }
    if (action === "EXPORT_DATA") {
      return <span className="rounded-md bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">ส่งออก CSV</span>;
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
              onClick={handleExportFilteredCsv}
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

        {/* Tab 3: TRANSACTIONS LIST & REPORTS */}
        {activeTab === "TRANSACTIONS" && (
          <div className="flex flex-col gap-4">
            {/* Header & Export Actions Bar */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-150">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <History className="size-4 text-zinc-700" />
                    ประวัติกระแสเงินสด & รายงานธุรกรรม
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    แสดง {filteredTransactions.length} จาก {transactions.length} รายการ (ปรับช่วงเวลาและส่งออกรายงานได้)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportFilteredCsv}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-100 active:scale-95 cursor-pointer"
                    title="ดาวน์โหลดรายการธุรกรรมตามเงื่อนไขที่เลือก"
                  >
                    <Download className="size-3.5 text-zinc-500" />
                    <span>CSV รายการ ({filteredTransactions.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMonthlyReportCsv}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100 active:scale-95 cursor-pointer"
                    title="ดาวน์โหลดรายงานสรุปแยกรายเดือน"
                  >
                    <FileText className="size-3.5 text-emerald-600" />
                    <span>CSV สรุปรายเดือน ({monthlyGroups.length} ด.)</span>
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsFundModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-zinc-800 active:scale-95 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>เติมเงิน</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Controls */}
              <div className="pt-3 flex flex-col gap-3">
                {/* Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1 mr-1">
                    <Calendar className="size-3.5" />
                    ช่วงเวลา:
                  </span>
                  {[
                    { id: "ALL", label: "ทั้งหมด" },
                    { id: "THIS_MONTH", label: "เดือนนี้" },
                    { id: "LAST_MONTH", label: "เดือนที่แล้ว" },
                    { id: "LAST_30_DAYS", label: "30 วันล่าสุด" },
                    { id: "CUSTOM", label: "กำหนดเอง 📅" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setDateFilterPreset(preset.id as any);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        dateFilterPreset === preset.id
                          ? "bg-zinc-900 text-white shadow-2xs"
                          : "bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Pickers */}
                {dateFilterPreset === "CUSTOM" && (
                  <div className="flex flex-wrap items-center gap-2 p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                    <span className="text-[11px] font-semibold text-zinc-500">ตั้งแต่วันที่:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-xs focus:ring-1 focus:ring-zinc-500 focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-zinc-500">ถึง:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-xs focus:ring-1 focus:ring-zinc-500 focus:outline-none"
                    />
                    {(customStartDate || customEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStartDate("");
                          setCustomEndDate("");
                        }}
                        className="text-[11px] text-rose-600 hover:underline ml-1"
                      >
                        ล้างวันที่
                      </button>
                    )}
                  </div>
                )}

                {/* Sub-Filters & View Mode Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                  {/* Flow Type Filter */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[11px] font-semibold text-zinc-500 mr-1 flex items-center gap-1">
                      <Filter className="size-3" />
                      ประเภท:
                    </span>
                    {[
                      { id: "ALL", label: "ทั้งหมด" },
                      { id: "INFLOW", label: "เงินเข้า (+)" },
                      { id: "OUTFLOW", label: "เงินออก (-)" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("selection");
                          setTxTypeFilter(f.id as any);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          txTypeFilter === f.id
                            ? f.id === "INFLOW"
                              ? "bg-emerald-600 text-white"
                              : f.id === "OUTFLOW"
                              ? "bg-rose-600 text-white"
                              : "bg-zinc-800 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setViewMode("TIMELINE");
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        viewMode === "TIMELINE"
                          ? "bg-white text-zinc-900 shadow-2xs"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <History className="size-3" />
                      <span>ตามลำดับเวลา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setViewMode("MONTHLY_GROUPED");
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        viewMode === "MONTHLY_GROUPED"
                          ? "bg-white text-zinc-900 shadow-2xs"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <Layers className="size-3" />
                      <span>สรุปรายเดือน ({monthlyGroups.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Metrics Banner for Current Filter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                  <ArrowDownRight className="size-3.5 text-emerald-600" />
                  <span>เงินเข้ารวม</span>
                </div>
                <p className="mt-1 font-mono text-base font-bold text-emerald-700">
                  +{formatPrivateAmount(rangeMetrics.inflow, isPrivacy)}
                </p>
              </div>

              <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-800">
                  <ArrowUpRight className="size-3.5 text-rose-600" />
                  <span>เงินออกรวม</span>
                </div>
                <p className="mt-1 font-mono text-base font-bold text-rose-700">
                  -{formatPrivateAmount(rangeMetrics.outflow, isPrivacy)}
                </p>
              </div>

              <div className={`rounded-xl border p-3 ${
                rangeMetrics.net >= 0
                  ? "border-emerald-200/80 bg-white"
                  : "border-rose-200/80 bg-white"
              }`}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600">
                  <BarChart3 className="size-3.5 text-zinc-500" />
                  <span>กระแสเงินสุทธิ (Net)</span>
                </div>
                <p className={`mt-1 font-mono text-base font-bold ${
                  rangeMetrics.net >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}>
                  {rangeMetrics.net >= 0 ? "+" : ""}
                  {formatPrivateAmount(rangeMetrics.net, isPrivacy)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-white p-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500">
                  <FileText className="size-3.5 text-zinc-400" />
                  <span>จำนวนรายการ</span>
                </div>
                <p className="mt-1 font-mono text-base font-bold text-zinc-800">
                  {rangeMetrics.count} <span className="text-xs font-normal text-zinc-500">รายการ</span>
                </p>
              </div>
            </div>

            {/* View Mode 1: Timeline Mode */}
            {viewMode === "TIMELINE" && (
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
                {filteredTransactions.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {filteredTransactions.map((tx) => {
                      const isInflow = tx.type === "CAPITAL_INJECTION" || tx.type === "REPAYMENT";
                      const dateStr = new Date(tx.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-xl border border-zinc-150 bg-zinc-50/70 p-3 transition-all duration-150 hover:bg-white hover:border-zinc-300 hover:shadow-2xs"
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
                    ไม่พบรายการธุรกรรมตามเงื่อนไขที่เลือก
                  </div>
                )}
              </div>
            )}

            {/* View Mode 2: Monthly Grouped Accordion Mode */}
            {viewMode === "MONTHLY_GROUPED" && (
              <div className="flex flex-col gap-3">
                {monthlyGroups.length > 0 ? (
                  monthlyGroups.map((grp) => {
                    const isExpanded = !!expandedMonths[grp.key];

                    return (
                      <div
                        key={grp.key}
                        className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs transition-all"
                      >
                        {/* Month Header Card */}
                        <div
                          onClick={() => toggleMonth(grp.key)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-zinc-50/80 transition-colors gap-3 select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold text-xs">
                              <Calendar className="size-5 text-zinc-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-zinc-900">{grp.label}</h4>
                                <span className="rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                                  {grp.transactions.length} รายการ
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500 mt-0.5">
                                <span>เข้า: <strong className="text-emerald-600 font-medium">+{formatPrivateAmount(grp.totalInflow, isPrivacy)}</strong></span>
                                <span>ออก: <strong className="text-rose-600 font-medium">-{formatPrivateAmount(grp.totalOutflow, isPrivacy)}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-zinc-400 font-semibold uppercase block">กระแสเงินสดสุทธิ</span>
                              <span className={`font-mono text-sm font-bold tabular-nums ${
                                grp.netBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}>
                                {grp.netBalance >= 0 ? "+" : ""}
                                {formatPrivateAmount(grp.netBalance, isPrivacy, " บาท")}
                              </span>
                            </div>

                            <button
                              type="button"
                              className="size-8 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-white"
                              aria-label="Toggle accordion"
                            >
                              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Transactions for Month */}
                        {isExpanded && (
                          <div className="border-t border-zinc-150 bg-zinc-50/50 p-3 sm:p-4 flex flex-col gap-2">
                            {/* Monthly Breakdown Pills */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 text-xs">
                              <div className="bg-white p-2 rounded-lg border border-zinc-200">
                                <span className="text-[10px] text-zinc-500 block">เติมทุนกองกลาง</span>
                                <span className="font-mono font-bold text-emerald-600">+{formatPrivateAmount(grp.totalInjected, isPrivacy)}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-zinc-200">
                                <span className="text-[10px] text-zinc-500 block">รับชำระคืน</span>
                                <span className="font-mono font-bold text-teal-600">+{formatPrivateAmount(grp.totalRepaid, isPrivacy)}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-zinc-200">
                                <span className="text-[10px] text-zinc-500 block">ปล่อยสินเชื่อกู้</span>
                                <span className="font-mono font-bold text-rose-600">-{formatPrivateAmount(grp.totalDisbursed, isPrivacy)}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-zinc-200">
                                <span className="text-[10px] text-zinc-500 block">ถอนทุน/หนี้สูญ</span>
                                <span className="font-mono font-bold text-amber-600">-{formatPrivateAmount(grp.totalWithdrawn, isPrivacy)}</span>
                              </div>
                            </div>

                            {/* Transactions List */}
                            {grp.transactions.map((tx) => {
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
                                  className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white p-2.5 transition-all text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                                        isInflow
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-rose-50 text-rose-700"
                                      }`}
                                    >
                                      {isInflow ? (
                                        <ArrowDownRight className="size-3.5" />
                                      ) : (
                                        <ArrowUpRight className="size-3.5" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-zinc-800 truncate">{tx.description}</p>
                                      <span className="text-[10px] text-zinc-400">{dateStr}</span>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span
                                      className={`font-mono font-bold tabular-nums ${
                                        isInflow ? "text-emerald-700" : "text-rose-700"
                                      }`}
                                    >
                                      {isInflow ? "+" : "-"}
                                      {formatPrivateAmount(tx.amount, isPrivacy)}
                                    </span>
                                    <span className="text-[9px] block text-zinc-400 uppercase font-semibold">
                                      {tx.type}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-400">
                    ไม่พบข้อมูลสำหรับจัดกลุ่มรายเดือนตามเงื่อนไขที่เลือก
                  </div>
                )}
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
                  { id: "EXPORT", label: "พิมพ์สลิป/ส่งออก" },
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
