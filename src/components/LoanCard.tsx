"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Phone, 
  MessageCircle, 
  ArrowUpRight, 
  AlertCircle, 
  Clock, 
  Check, 
  CheckCircle2, 
  Trash2, 
  FileText, 
  AlertTriangle 
} from "lucide-react";
import { formatLineReminderText } from "@/lib/line-reminder";

export interface LoanCardData {
  id: string;
  borrowerName: string;
  nickname?: string | null;
  phone: string;
  workplace?: string | null;
  facebookUrl?: string | null;
  creditGrade: "NEW" | "GOOD" | "VIP" | "WATCHLIST" | "BLACKLIST";
  remainingPrincipal: number;
  termType: "DAYS_7" | "DAYS_10" | "CUSTOM";
  interestRate: number;
  rolloverCount: number;
  accruedInterest: number;
  penaltyAccrued: number;
  status: "ACTIVE" | "PARTIALLY_PAID" | "OVERDUE" | "SETTLED" | "BAD_DEBT";
  currentDueDate: string;
  daysDiff: number;
}

interface LoanCardProps {
  loan: LoanCardData;
  onPaymentClick?: (loanId: string) => void;
  onDeleteClick?: (loan: LoanCardData) => void;
  onBadDebtClick?: (loan: LoanCardData) => void;
  userRole?: "OWNER" | "AGENT";
}

export function LoanCard(props: LoanCardProps) {
  const { loan, onPaymentClick, onDeleteClick, onBadDebtClick, userRole = "OWNER" } = props;
  const [copied, setCopied] = useState(false);

  const isSettled = loan.status === "SETTLED";
  const isBadDebt = loan.status === "BAD_DEBT";

  // คำนวณดอกเบี้ยรอบปัจจุบัน
  const cycleInterest = loan.remainingPrincipal * loan.interestRate;
  
  // ยอดชำระขั้นต่ำเพื่อตัดดอก (ค่าปรับ + ดอกค้าง + ดอกรอบปัจจุบัน)
  const totalDueForRollover = loan.penaltyAccrued + loan.accruedInterest + cycleInterest;

  // ยอดปิดสัญญาเต็มจำนวน
  const totalSettlement = totalDueForRollover + loan.remainingPrincipal;

  // คำนวณความคืบหน้าของรอบสัญญา (Cycle Progress)
  const totalCycleDays = loan.termType === "DAYS_7" ? 7 : loan.termType === "DAYS_10" ? 10 : 7;
  const elapsedDays = Math.max(0, Math.min(totalCycleDays, totalCycleDays - loan.daysDiff));
  const progressPercent = loan.daysDiff < 0 ? 100 : Math.round((elapsedDays / totalCycleDays) * 100);

  // ฟังก์ชันหาตัวอักษรย่อสำหรับ Avatar
  const getInitials = (name: string, nickname?: string | null) => {
    if (nickname && nickname.trim()) {
      return nickname.trim().slice(0, 2);
    }
    const clean = name.trim();
    return clean.slice(0, 2) || "LT";
  };

  // Tier Style Configurations
  const tierConfig = {
    VIP: {
      avatarRing: "ring-2 ring-purple-400/80 shadow-purple-100",
      avatarBg: "bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 text-white",
      badgeClass: "bg-purple-100 text-purple-800 border-purple-200 shadow-2xs font-extrabold",
    },
    GOOD: {
      avatarRing: "ring-2 ring-emerald-400/80 shadow-emerald-100",
      avatarBg: "bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 text-white",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs font-extrabold",
    },
    NEW: {
      avatarRing: "ring-2 ring-blue-300 shadow-blue-100",
      avatarBg: "bg-gradient-to-br from-blue-500 via-sky-600 to-indigo-600 text-white",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
    },
    WATCHLIST: {
      avatarRing: "ring-2 ring-amber-400/80 shadow-amber-100",
      avatarBg: "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 text-white",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-black tracking-wide",
    },
    BLACKLIST: {
      avatarRing: "ring-2 ring-rose-500 shadow-rose-100",
      avatarBg: "bg-gradient-to-br from-rose-700 via-red-700 to-rose-900 text-white",
      badgeClass: "bg-rose-100 text-rose-900 border-rose-300 font-black tracking-wide animate-pulse",
    },
  }[loan.creditGrade] ?? {
    avatarRing: "ring-2 ring-zinc-300",
    avatarBg: "bg-zinc-700 text-white",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 font-medium",
  };

  // ฟังก์ชัน 1-Click คัดลอกข้อความแจ้งยอดส่ง LINE
  const handleCopyBill = async () => {
    const billText = formatLineReminderText({
      borrowerName: loan.borrowerName,
      nickname: loan.nickname,
      remainingPrincipal: loan.remainingPrincipal,
      cycleInterest,
      penaltyAccrued: loan.penaltyAccrued,
      accruedInterest: loan.accruedInterest,
      currentDueDate: loan.currentDueDate,
      daysDiff: loan.daysDiff,
      status: loan.status,
    });

    try {
      await navigator.clipboard.writeText(billText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
      isSettled 
        ? "border-emerald-200/90 bg-emerald-50/20" 
        : isBadDebt
        ? "border-rose-200/90 bg-rose-50/20"
        : "border-zinc-200/90 bg-white hover:border-zinc-300/90"
    }`}>
      {/* Top Bar: Borrower Info, Avatar, Status Badge & Delete Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Borrower Avatar with Tier Gradient Ring */}
          <div className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl font-black text-xs uppercase shadow-xs transition-transform duration-200 group-hover:scale-105 ${tierConfig.avatarBg} ${tierConfig.avatarRing}`}>
            {getInitials(loan.borrowerName, loan.nickname)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/loans/${loan.id}/contract`}
                className="text-base font-bold tracking-tight text-zinc-900 truncate hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1 group/name"
                title="ดู/พิมพ์สัญญาฉบับเต็ม"
              >
                <span>{loan.borrowerName}</span>
                {loan.nickname && (
                  <span className="text-xs font-medium text-zinc-500">({loan.nickname})</span>
                )}
                <FileText className="size-3 text-zinc-400 group-hover/name:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
              <span
                className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] border transition-transform duration-150 ${tierConfig.badgeClass}`}
              >
                {loan.creditGrade}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-zinc-500 truncate flex items-center gap-1">
              <span>{loan.workplace ?? "ไม่ระบุสถานที่ทำงาน"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Status Badge */}
          {isSettled ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
              <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
              ปิดยอดแล้ว
            </span>
          ) : isBadDebt ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-900 shadow-2xs">
              <AlertTriangle className="size-3 text-rose-700 shrink-0" />
              หนี้สูญ (Bad Debt)
            </span>
          ) : loan.status === "OVERDUE" || loan.daysDiff < 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 shadow-2xs">
              <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
              เกินกำหนด {Math.abs(loan.daysDiff)} วัน
            </span>
          ) : loan.daysDiff === 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              ครบกำหนดวันนี้
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 shadow-2xs">
              <Clock className="size-3 text-zinc-500 shrink-0" />
              อีก {loan.daysDiff} วัน
            </span>
          )}

          {/* View Contract Button */}
          <Link
            href={`/loans/${loan.id}/contract`}
            title="ดูสัญญาเงินกู้ / พิมพ์สัญญา"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors select-none cursor-pointer"
          >
            <FileText className="size-3.5" />
          </Link>

          {/* Delete Button */}
          {onDeleteClick && (
            <button
              type="button"
              onClick={() => onDeleteClick(loan)}
              title="ลบสัญญานี้"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer select-none"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Financial Numbers */}
      <div className={`mt-3.5 rounded-xl border p-3.5 transition-colors duration-200 ${
        isSettled 
          ? "border-emerald-200 bg-emerald-50/50" 
          : isBadDebt
          ? "border-rose-200 bg-rose-50/40"
          : "border-zinc-150 bg-slate-50/80 group-hover:bg-slate-50"
      }`}>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold text-zinc-500">
            {isSettled ? "สถานะหนี้" : isBadDebt ? "ยอดตัดหนี้สูญ" : "เงินต้นคงค้าง"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`font-mono text-2xl font-black tracking-tight tabular-nums ${
              isSettled ? "text-emerald-700" : isBadDebt ? "text-rose-700" : "text-zinc-900 group-hover:text-black"
            } transition-colors`}>
              {loan.remainingPrincipal.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              {isSettled ? "บาท (จบยอดแล้ว)" : isBadDebt ? "บาท (ตัดขาดทุน)" : "บาท"}
            </span>
          </div>
        </div>

        {isSettled ? (
          <div className="mt-2 border-t border-emerald-200/80 pt-2 flex items-center justify-between text-xs text-emerald-800">
            <span>ชำระปิดยอดเรียบร้อยแล้ว</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Check className="size-3.5" /> คืนเงินต้นครบถ้วน
            </span>
          </div>
        ) : isBadDebt ? (
          <div className="mt-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ตัดจำหน่ายเป็นหนี้สูญแล้ว</span>
              <p className="mt-0.5 text-[11px] text-rose-700">
                นำยอดเงินต้นค้างออกจากระบบและบันทึกลงบัญชีรายจ่ายขาดทุนเรียบร้อยแล้ว
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-2.5 text-xs">
              <div>
                <span className="text-zinc-500 text-[11px] font-medium">ยอดตัดดอกรอบนี้</span>
                <p className="font-mono text-base font-extrabold tabular-nums text-amber-700">
                  {totalDueForRollover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </p>
              </div>

              <div className="text-right">
                <span className="text-zinc-500 text-[11px] font-medium">รอบสัญญา</span>
                <p className="font-bold text-xs text-zinc-800">
                  {loan.termType === "DAYS_7"
                    ? "7 วัน (15%)"
                    : loan.termType === "DAYS_10"
                    ? "10 วัน (20%)"
                    : `กำหนดเอง (${(loan.interestRate * 100).toFixed(0)}%)`}
                </p>
              </div>
            </div>

            {/* Term Progress Bar */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-500 flex items-center gap-1 font-medium">
                  <Clock className="size-3 text-zinc-400" />
                  ระยะเวลาในรอบ ({elapsedDays}/{totalCycleDays} วัน)
                </span>
                <span className={`font-bold tabular-nums text-[11px] ${
                  loan.daysDiff < 0 ? "text-rose-600" : loan.daysDiff === 0 ? "text-amber-600" : "text-zinc-600"
                }`}>
                  {loan.daysDiff < 0 
                    ? `เลยกำหนด ${Math.abs(loan.daysDiff)} วัน` 
                    : loan.daysDiff === 0 
                    ? "ครบกำหนดวันนี้" 
                    : `เหลืออีก ${loan.daysDiff} วัน`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    loan.daysDiff < 0 
                      ? "bg-rose-500" 
                      : loan.daysDiff === 0 
                      ? "bg-amber-500" 
                      : "bg-emerald-500"
                  }`} 
                  style={{ width: `${Math.min(100, Math.max(8, progressPercent))}%` }}
                />
              </div>
            </div>

            {/* Rollover Quota Segments */}
            <div className="mt-2.5 flex items-center justify-between border-t border-zinc-200/80 pt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-600 font-medium">โควตาต่อดอก:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((step) => {
                    const isUsed = loan.rolloverCount >= step;
                    return (
                      <span
                        key={step}
                        className={`h-2 w-4.5 rounded-xs transition-colors ${
                          isUsed 
                            ? loan.rolloverCount >= 3 
                              ? "bg-rose-500 shadow-2xs" 
                              : "bg-amber-500 shadow-2xs" 
                            : "bg-zinc-200"
                        }`}
                        title={`รอบที่ ${step}`}
                      />
                    );
                  })}
                </div>
                <strong className={loan.rolloverCount >= 3 ? "text-rose-600 font-black ml-1" : "text-zinc-800 ml-1 font-bold"}>
                  {loan.rolloverCount}/3
                </strong>
              </div>

              {loan.rolloverCount >= 3 ? (
                <span className="font-bold text-rose-600 flex items-center gap-1 text-[11px] animate-pulse">
                  <AlertCircle className="size-3 text-rose-600" />
                  รอบหน้าบังคับปิดยอด!
                </span>
              ) : (
                <span className="text-zinc-400 text-[10px]">
                  (ต่อดอกได้อีก {3 - loan.rolloverCount} รอบ)
                </span>
              )}
            </div>

            {/* Overdue Penalty note if any */}
            {loan.penaltyAccrued > 0 && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-rose-600 font-medium bg-rose-50/80 px-2 py-1 rounded-md border border-rose-100">
                <span>ค่าปรับรายวันสะสม:</span>
                <span className="font-mono font-bold tabular-nums">+{loan.penaltyAccrued.toFixed(2)} ฿</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Action Buttons (Min 44px ergonomic touch targets) */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {/* Call Borrower */}
        <a
          href={`tel:${loan.phone}`}
          className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50/80 text-xs font-bold text-zinc-700 shadow-2xs transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer"
          title="โทรหาลูกหนี้"
        >
          <Phone className="size-3.5 text-emerald-600 shrink-0" />
          <span>โทร</span>
        </a>

        {/* 1-Click Copy Bill for LINE */}
        <button
          type="button"
          onClick={handleCopyBill}
          className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/90 text-xs font-bold text-emerald-800 shadow-2xs transition-all duration-150 hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-95 cursor-pointer"
          title="คัดลอกข้อความแจ้งยอดส่ง LINE"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-700 shrink-0" />
              <span className="text-emerald-700 font-bold">คัดลอกแล้ว!</span>
            </>
          ) : (
            <>
              <MessageCircle className="size-3.5 text-emerald-600 shrink-0" />
              <span>แจ้งยอด LINE</span>
            </>
          )}
        </button>

        {/* Repayment or Settled Action */}
        {!isSettled && !isBadDebt ? (
          <button
            type="button"
            onClick={() => onPaymentClick?.(loan.id)}
            className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 text-xs font-extrabold text-white shadow-xs transition-all duration-150 hover:from-zinc-800 hover:to-zinc-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
          >
            <span>รับเงิน</span>
            <ArrowUpRight className="size-3.5 shrink-0" />
          </button>
        ) : isBadDebt ? (
          <div className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl bg-rose-100 text-xs font-bold text-rose-800 border border-rose-300 select-none cursor-default">
            <span>หนี้สูญ</span>
          </div>
        ) : (
          <div className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-300 select-none cursor-default">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
            <span>จบสัญญา</span>
          </div>
        )}
      </div>

      {/* Bad Debt Write-Off Option for Owner on Overdue Loans */}
      {userRole === "OWNER" && (loan.status === "OVERDUE" || loan.daysDiff < 0) && !isSettled && !isBadDebt && onBadDebtClick && (
        <div className="mt-2.5 flex items-center justify-end border-t border-zinc-150 pt-2">
          <button
            type="button"
            onClick={() => onBadDebtClick(loan)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer min-h-[32px]"
          >
            <AlertTriangle className="size-3 text-rose-600" />
            <span>ตัดจำหน่ายเป็นหนี้สูญ (Bad Debt)</span>
          </button>
        </div>
      )}
    </div>
  );
}
