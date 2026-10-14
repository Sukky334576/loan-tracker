"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Wallet, 
  Plus, 
  Minus, 
  Sliders, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles
} from "lucide-react";
import { 
  addCapitalAction, 
  setFundBalanceAction, 
  resetDatabaseToProductionAction 
} from "@/app/actions/ledger";

interface FundModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess?: () => void;
}

export function FundModal({
  isOpen,
  onClose,
  currentBalance,
  onSuccess,
}: FundModalProps) {
  const [activeTab, setActiveTab] = useState<"ADD" | "SET" | "RESET">("ADD");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setAmount("");
    setNotes("");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleTabChange = (tab: "ADD" | "SET" | "RESET") => {
    setActiveTab(tab);
    handleResetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numAmount = Number(amount);

    if (activeTab === "ADD") {
      if (!numAmount || numAmount <= 0) {
        setErrorMessage("กรุณาระบุจำนวนเงินที่ต้องการเติม (มากกว่า 0 บาท)");
        return;
      }

      setIsSubmitting(true);
      const res = await addCapitalAction({
        amount: numAmount,
        type: "CAPITAL_INJECTION",
        description: notes.trim() || `เติมเงินทุนเข้ากองกลาง +${numAmount.toLocaleString()} ฿`,
      });
      setIsSubmitting(false);

      if (res.success) {
        setSuccessMessage(`เติมเงินเข้ากองกลางสำเร็จ +${numAmount.toLocaleString()} บาท`);
        setTimeout(() => {
          onClose();
          handleResetForm();
          onSuccess?.();
        }, 1200);
      } else {
        setErrorMessage(res.error ?? "เกิดข้อผิดพลาดในการบันทึก");
      }
    } else if (activeTab === "SET") {
      if (amount === "" || isNaN(numAmount) || numAmount < 0) {
        setErrorMessage("กรุณาระบุยอดเงินกองกลางที่ต้องการกำหนด");
        return;
      }

      setIsSubmitting(true);
      const res = await setFundBalanceAction({
        targetAmount: numAmount,
        description: notes.trim() || `กำหนดเงินกองกลางเริ่มต้นใหม่เป็น ${numAmount.toLocaleString()} ฿`,
      });
      setIsSubmitting(false);

      if (res.success) {
        setSuccessMessage(`กำหนดเงินกองกลางเป็น ${numAmount.toLocaleString()} บาท เรียบร้อยแล้ว`);
        setTimeout(() => {
          onClose();
          handleResetForm();
          onSuccess?.();
        }, 1200);
      } else {
        setErrorMessage(res.error ?? "เกิดข้อผิดพลาดในการบันทึก");
      }
    } else if (activeTab === "RESET") {
      if (!confirm("⚠️ ยืนยันการล้างข้อมูลทดสอบทั้งหมด? ข้อมูลลูกหนี้และสัญญาตัวอย่างจะถูกลบทั้งหมดเพื่อเริ่มใช้งานจริง (บัญชีผู้ใช้จะยังอยู่ครบ)")) {
        return;
      }

      setIsSubmitting(true);
      const res = await resetDatabaseToProductionAction({
        initialCapital: numAmount > 0 ? numAmount : 0,
      });
      setIsSubmitting(false);

      if (res.success) {
        setSuccessMessage("ล้างข้อมูลตัวอย่างและตั้งค่าเริ่มต้นสำหรับใช้งานจริงเรียบร้อยแล้ว!");
        setTimeout(() => {
          onClose();
          handleResetForm();
          onSuccess?.();
        }, 1400);
      } else {
        setErrorMessage(res.error ?? "เกิดข้อผิดพลาดในการล้างข้อมูล");
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-200 bg-white p-5 shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        >
          {/* Grab handle for mobile */}
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Wallet className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  จัดการเงินสดกองกลาง
                </h3>
                <p className="text-xs text-zinc-500">
                  ยอดคงเหลือปัจจุบัน:{" "}
                  <strong className="font-mono text-blue-700 font-bold">
                    {currentBalance.toLocaleString()} ฿
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => handleTabChange("ADD")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ADD"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Plus className="size-3.5" />
              <span>เติมเงินทุน</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("SET")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "SET"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Sliders className="size-3.5" />
              <span>ตั้งยอดเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("RESET")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "RESET"
                  ? "bg-rose-50 text-rose-700 shadow-xs border border-rose-200"
                  : "text-rose-500 hover:text-rose-700"
              }`}
            >
              <RotateCcw className="size-3.5" />
              <span>ล้างตัวเทส</span>
            </button>
          </div>

          {/* Status Message */}
          {errorMessage && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
            {activeTab === "ADD" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    จำนวนเงินที่ต้องการเติมเข้ากองกลาง (บาท)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="เช่น 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-base font-bold text-zinc-900 tabular-nums focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    required
                  />
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {[10000, 20000, 50000, 100000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(String(v))}
                        className="rounded-lg bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition-colors cursor-pointer"
                      >
                        +{v.toLocaleString()} ฿
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    บันทึก / ที่มาของเงิน (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น เติมทุนหมุนเวียนรอบสัปดาห์, โอนจาก บช. ธ.กรุงเทพ"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {activeTab === "SET" && (
              <>
                <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 text-xs text-blue-900">
                  <p className="font-semibold">💡 ปรับยอดให้ตรงกับเงินสดที่มีจริงในมือ</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    ระบบจะคำนวณส่วนต่างและบันทึกประวัติการปรับปรุงยอดเข้า/ออกให้อัตโนมัติ
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ระบุยอดเงินกองกลางที่ถูกต้อง (บาท)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="เช่น 100000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-base font-bold text-zinc-900 tabular-nums focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    เหตุผลการปรับยอด (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตั้งค่ายอดเงินทุนตั้งต้นเริ่มต้นระบบ"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {activeTab === "RESET" && (
              <>
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <RotateCcw className="size-4 text-rose-600" />
                    ล้างข้อมูลทดสอบเพื่อเริ่มปล่อยกู้จริง
                  </p>
                  <ul className="list-disc list-inside mt-1.5 text-[11px] text-rose-700 space-y-0.5">
                    <li>ลบรายชื่อลูกหนี้ทดสอบ 3 รายทั้งหมด</li>
                    <li>ลบสัญญากู้และประวัติการรับเงินทดสอบทั้งหมด</li>
                    <li>
                      <strong>เก็บบัญชีผู้ใช้:</strong> นายทุน (`owner`) และ สายตรวจ (`agent1`) ไว้ใช้งานต่อได้ทันที
                    </li>
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    กำหนดเงินกองกลางเริ่มต้นสำหรับใช้งานจริง (บาท)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="เช่น 100000 (ใส่ 0 ได้)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-base font-bold text-zinc-900 tabular-nums focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    *ยอดนี้จะเป็นเงินสดกองกลางก้อนแรกพร้อมให้สายตรวจเบิกไปปล่อยกู้
                  </p>
                </div>
              </>
            )}

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              type="submit"
              className={`mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-md transition-all select-none cursor-pointer ${
                activeTab === "RESET"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-zinc-900 hover:bg-zinc-800"
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>กำลังประมวลผล...</span>
                </>
              ) : activeTab === "ADD" ? (
                <>
                  <Plus className="size-4" />
                  <span>ยืนยันเติมเงินกองกลาง</span>
                </>
              ) : activeTab === "SET" ? (
                <>
                  <Sliders className="size-4" />
                  <span>บันทึกยอดเงินกองกลางใหม่</span>
                </>
              ) : (
                <>
                  <RotateCcw className="size-4" />
                  <span>ยืนยันล้างข้อมูลตัวเทส & เริ่มระบบจริง</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
