"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  CheckCircle2, 
  Camera, 
  Upload, 
  AlertCircle, 
  Banknote, 
  Receipt, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { LoanCardData } from "@/components/LoanCard";

interface RepaymentDrawerProps {
  loan: LoanCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RepaymentDrawer({
  loan,
  isOpen,
  onClose,
  onSuccess,
}: RepaymentDrawerProps) {
  const [payType, setPayType] = useState<"INTEREST" | "PRINCIPAL_CUT" | "SETTLE">("INTEREST");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!loan) return null;

  // Waterfall Calculation
  const cycleInterest = loan.remainingPrincipal * loan.interestRate;
  const minInterestDue = loan.penaltyAccrued + loan.accruedInterest + cycleInterest;
  const fullSettlementDue = minInterestDue + loan.remainingPrincipal;

  const currentAmount =
    payType === "INTEREST"
      ? minInterestDue
      : payType === "SETTLE"
      ? fullSettlementDue
      : Number(customAmount) || minInterestDue;

  // Handle image select
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    // Simulate payment processing with smooth feedback
    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      onClose();
      onSuccess?.();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 280,
            }}
            className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-200/90 bg-white p-5 shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
          >
            {/* Grab Handle for Mobile */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300/80 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  บันทึกรับชำระเงิน
                </span>
                <h3 className="text-base font-bold text-zinc-900">
                  {loan.borrowerName}
                </h3>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            {submittedSuccess ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-8 text-center flex flex-col items-center justify-center"
              >
                <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                  <CheckCircle2 className="size-8" />
                </div>
                <h4 className="text-base font-bold text-zinc-900">บันทึกรับเงินเรียบร้อย!</h4>
                <p className="text-xs text-zinc-500 mt-1">ยอดเงินถูกนำไปหักตามลำดับ Waterfall แล้ว</p>
              </motion.div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {/* Mode Selector Tabs with Motion Pill */}
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100/90 p-1">
                  {(
                    [
                      { id: "INTEREST", label: "ตัดดอก" },
                      { id: "PRINCIPAL_CUT", label: "โปะต้น" },
                      { id: "SETTLE", label: "ปิดยอด" },
                    ] as const
                  ).map((tab) => {
                    const isSelected = payType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPayType(tab.id)}
                        className={`relative rounded-lg py-2 text-xs font-bold transition-colors select-none ${
                          isSelected ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="payTypeTab"
                            transition={{ type: "spring", damping: 25, stiffness: 400 }}
                            className="absolute inset-0 rounded-lg bg-white shadow-xs"
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Waterfall Breakdown Card */}
                <div className="rounded-2xl border border-zinc-200 bg-slate-50/90 p-3.5 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-500 font-medium">ลำดับการหักเงิน (Waterfall)</span>
                    <span className="text-[11px] font-semibold text-zinc-700">
                      รอบ {loan.termType === "DAYS_7" ? "7 วัน" : "10 วัน"} (รอบที่ {loan.rolloverCount}/3)
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t border-zinc-200/80 pt-2 text-[11px]">
                    {loan.penaltyAccrued > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>1. หักค่าปรับค้างชำระ:</span>
                        <span className="font-mono tabular-nums font-bold">+{loan.penaltyAccrued.toFixed(2)} ฿</span>
                      </div>
                    )}
                    {loan.accruedInterest > 0 && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>2. หักดอกค้างรอบก่อน:</span>
                        <span className="font-mono tabular-nums font-bold">+{loan.accruedInterest.toFixed(2)} ฿</span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-700">
                      <span>3. ดอกเบี้ยรอบปัจจุบัน:</span>
                      <span className="font-mono tabular-nums font-bold">{cycleInterest.toLocaleString()} ฿</span>
                    </div>

                    {payType === "SETTLE" && (
                      <div className="flex justify-between text-emerald-700 font-semibold border-t border-dashed border-zinc-200 pt-1">
                        <span>4. เงินต้นทั้งหมด:</span>
                        <span className="font-mono tabular-nums font-bold">{loan.remainingPrincipal.toLocaleString()} ฿</span>
                      </div>
                    )}

                    <div className="mt-1 flex items-baseline justify-between border-t border-zinc-200 pt-2 text-sm font-bold text-zinc-900">
                      <span>ยอดที่ต้องชำระ:</span>
                      <span className="font-mono text-xl tabular-nums text-emerald-700 font-extrabold">
                        {currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom Amount for Principal Cut */}
                {payType === "PRINCIPAL_CUT" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-1"
                  >
                    <label className="text-xs font-semibold text-zinc-700">
                      ระบุยอดเงินที่รับมา (ต้องมากกว่า {minInterestDue.toLocaleString()} ฿ เพื่อตัดต้น)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={`เช่น ${(minInterestDue + 1000).toLocaleString()}`}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-base font-bold text-zinc-900 tabular-nums focus:border-zinc-500 focus:outline-none"
                    />
                  </motion.div>
                )}

                {/* Slip Upload Zone */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    แนบภาพสลิปโอนเงิน (BBL 546-7-396726)
                  </label>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-3 hover:bg-zinc-100 transition-colors">
                    {slipPreview ? (
                      <div className="flex items-center gap-3 w-full">
                        <img
                          src={slipPreview}
                          alt="Slip Preview"
                          className="size-12 rounded-lg object-cover border border-zinc-200 shadow-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-zinc-800 truncate">
                            {slipFile?.name}
                          </p>
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <Sparkles className="size-3" />
                            พร้อมประมวลผล OCR
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 underline">เปลี่ยน</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Camera className="size-4 text-zinc-400" />
                        <span>แตะเพื่อถ่ายรูปสลิป หรือเลือกจากอัลบั้ม</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Confirm Action Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  onClick={handleConfirmPayment}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 disabled:opacity-50 select-none"
                >
                  {isSubmitting ? (
                    <span>กำลังบันทึกยอด...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>
                        ยืนยันรับยอด{" "}
                        {currentAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </span>
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
