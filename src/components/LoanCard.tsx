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
    <div className={`group relative overflow-hidden rounded-2xl border p-4.5 shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md ${
      isSettled 
        ? "border-emerald-200 bg-emerald-50/20" 
        : isBadDebt
        ? "border-rose-200 bg-rose-50/20"
        : "border-zinc-200/90 bg-white hover:border-zinc-300"
    }`}>
      {/* Top Bar: Borrower Info, Status Badge & Delete Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/loans/${loan.id}/contract`}
              className="text-base font-bold tracking-tight text-zinc-900 truncate hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1 group/name"
              title="ดู/พิมพ์สัญญาฉบับเต็ม"
            >
              <span>{loan.borrowerName}</span>
              {loan.nickname && (
                <span className="text-xs font-normal text-zinc-500">({loan.nickname})</span>
              )}
              <FileText className="size-3 text-zinc-400 group-hover/name:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-transform duration-150 group-hover:scale-105 ${
                loan.creditGrade === "VIP"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : loan.creditGrade === "GOOD"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : loan.creditGrade === "WATCHLIST"
                  ? "bg-amber-50 text-amber-800 border border-amber-300 font-extrabold"
                  : loan.creditGrade === "BLACKLIST"
                  ? "bg-rose-50 text-rose-700 border border-rose-200 font-extrabold"
                  : "bg-zinc-100 text-zinc-700 border border-zinc-200"
              }`}
            >
              {loan.creditGrade}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-zinc-500 truncate">
            {loan.workplace ?? "ไม่ระบุสถานที่ทำงาน"}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Status Badge */}
          {isSettled ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
              <CheckCircle2 className="size-3 text-emerald-600" />
              ปิดยอดแล้ว
            </span>
          ) : loan.status === "OVERDUE" || loan.daysDiff < 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 shadow-2xs">
              <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
              เกินกำหนด {Math.abs(loan.daysDiff)} วัน
            </span>
          ) : loan.daysDiff === 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs">
              <span className="size-1.5 rounded-full bg-amber-500" />
              ครบกำหนดวันนี้
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 shadow-2xs">
              <Clock className="size-3 text-zinc-500" />
              อีก {loan.daysDiff} วัน
            </span>
          )}

          {/* View Contract Button */}
          <Link
            href={`/loans/${loan.id}/contract`}
            title="ดูสัญญาเงินกู้ / พิมพ์สัญญา"
            className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors select-none cursor-pointer"
          >
            <FileText className="size-3.5" />
          </Link>

          {/* Delete Button */}
          {onDeleteClick && (
            <button
              type="button"
              onClick={() => onDeleteClick(loan)}
              title="ลบสัญญานี้"
              className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer select-none"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Financial Numbers */}
      <div className={`mt-3.5 rounded-xl border p-3 transition-colors duration-200 ${
        isSettled 
          ? "border-emerald-200 bg-emerald-50/50" 
          : "border-zinc-150 bg-slate-50/80 group-hover:bg-slate-50"
      }`}>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-zinc-500">
            {isSettled ? "สถานะหนี้" : "เงินต้นคงค้าง"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`font-mono text-xl font-bold tracking-tight tabular-nums ${
              isSettled ? "text-emerald-700" : "text-zinc-900 group-hover:text-black"
            } transition-colors`}>
              {loan.remainingPrincipal.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-zinc-400">
              {isSettled ? "บาท (จบยอดแล้ว)" : "บาท"}
            </span>
          </div>
        </div>

        {!isSettled ? (
          <>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-2 text-xs">
              <div>
                <span className="text-zinc-500 text-[11px]">ยอดตัดดอกรอบนี้</span>
                <p className="font-mono text-sm font-bold tabular-nums text-amber-700">
                  {totalDueForRollover.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </p>
              </div>

              <div className="text-right">
                <span className="text-zinc-500 text-[11px]">รอบสัญญา</span>
                <p className="font-semibold text-xs text-zinc-700">
                  {loan.termType === "DAYS_7"
                    ? "7 วัน (15%)"
                    : loan.termType === "DAYS_10"
                    ? "10 วัน (20%)"
                    : `กำหนดเอง (${(loan.interestRate * 100).toFixed(0)}%)`}
                </p>
              </div>
            </div>

            {/* Rollover Round Indicator */}
            <div className="mt-2.5 flex items-center justify-between border-t border-zinc-200/80 pt-2 text-[11px]">
              <span className="text-zinc-600">
                โควตาต่อดอก:{" "}
                <strong className={loan.rolloverCount >= 3 ? "text-rose-600 font-bold" : "text-zinc-800"}>
                  รอบที่ {loan.rolloverCount}/3
                </strong>
              </span>

              {loan.rolloverCount >= 3 ? (
                <span className="font-bold text-rose-600 flex items-center gap-1 text-[11px]">
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
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-rose-600 font-medium">
                <span>ค่าปรับรายวันสะสม:</span>
                <span className="font-mono font-bold tabular-nums">+{loan.penaltyAccrued.toFixed(2)} ฿</span>
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 border-t border-emerald-200/80 pt-2 flex items-center justify-between text-xs text-emerald-800">
            <span>ชำระปิดยอดเรียบร้อยแล้ว</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Check className="size-3.5" /> คืนเงินต้นครบถ้วน
            </span>
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {/* Call Borrower */}
        <a
          href={`tel:${loan.phone}`}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 hover:-translate-y-0.5 hover:shadow-2xs active:translate-y-0 active:scale-95 cursor-pointer"
          title="โทรหาลูกหนี้"
        >
          <Phone className="size-3.5 text-emerald-600" />
          <span>โทร</span>
        </a>

        {/* 1-Click Copy Bill for LINE */}
        <button
          type="button"
          onClick={handleCopyBill}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-xs font-semibold text-emerald-800 transition-all duration-150 hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-0.5 hover:shadow-2xs active:translate-y-0 active:scale-95 cursor-pointer"
          title="คัดลอกข้อความแจ้งยอดส่ง LINE"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-700" />
              <span className="text-emerald-700 font-bold">คัดลอกแล้ว!</span>
            </>
          ) : (
            <>
              <MessageCircle className="size-3.5 text-emerald-600" />
              <span>📋 แจ้งยอด LINE</span>
            </>
          )}
        </button>

        {/* Repayment or Settled Action */}
        {!isSettled && !isBadDebt ? (
          <button
            type="button"
            onClick={() => onPaymentClick?.(loan.id)}
            className="flex h-10 items-center justify-center gap-1 rounded-xl bg-zinc-900 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-zinc-800 hover:shadow-sm hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-95 cursor-pointer"
          >
            <span>รับเงิน</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        ) : isBadDebt ? (
          <div className="flex h-10 items-center justify-center gap-1 rounded-xl bg-rose-100 text-xs font-bold text-rose-800 border border-rose-300 select-none cursor-default">
            <span>หนี้สูญ</span>
          </div>
        ) : (
          <div className="flex h-10 items-center justify-center gap-1 rounded-xl bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-300 select-none cursor-default">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
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
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
          >
            <AlertTriangle className="size-3 text-rose-600" />
            <span>ตัดจำหน่ายเป็นหนี้สูญ (Bad Debt)</span>
          </button>
        </div>
      )}
    </div>
  );
}
