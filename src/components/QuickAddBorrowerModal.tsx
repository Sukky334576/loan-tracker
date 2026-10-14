"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  UserPlus, 
  Phone, 
  CreditCard, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles
} from "lucide-react";
import { createBorrowerAction } from "@/app/actions/borrowers";

export interface CreatedBorrower {
  id: string;
  fullName: string;
  phone: string;
  creditGrade: string;
  creditLimit: number;
  activePrincipal: number;
  availableCredit: number;
}

interface QuickAddBorrowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBorrower: CreatedBorrower) => void;
}

export function QuickAddBorrowerModal({
  isOpen,
  onClose,
  onSuccess,
}: QuickAddBorrowerModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [citizenId, setCitizenId] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [creditLimit, setCreditLimit] = useState("2000");
  const [creditGrade, setCreditGrade] = useState<"NEW" | "GOOD">("NEW");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateCitizenId = () => {
    // Generate a random 13 digit number for convenience if testing or unknown
    let randomId = "1";
    for (let i = 0; i < 12; i++) {
      randomId += Math.floor(Math.random() * 10).toString();
    }
    setCitizenId(randomId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanId = citizenId.replace(/\D/g, "");

    if (!cleanName) {
      setErrorMessage("กรุณาระบุชื่อ-นามสกุลของลูกหนี้");
      return;
    }

    if (!cleanPhone) {
      setErrorMessage("กรุณาระบุเบอร์โทรศัพท์");
      return;
    }

    if (cleanId.length !== 13) {
      setErrorMessage("เลขบัตรประชาชนต้องมี 13 หลัก");
      return;
    }

    const limitNum = Number(creditLimit) || 2000;

    setIsSubmitting(true);
    const res = await createBorrowerAction({
      citizenId: cleanId,
      fullName: cleanName,
      phone: cleanPhone,
      workplace: workplace.trim() || undefined,
      creditLimit: limitNum,
      creditGrade,
    });
    setIsSubmitting(false);

    if (res.success && res.borrowerId) {
      onSuccess({
        id: res.borrowerId,
        fullName: cleanName,
        phone: cleanPhone,
        creditGrade,
        creditLimit: limitNum,
        activePrincipal: 0,
        availableCredit: limitNum,
      });
      onClose();
    } else {
      setErrorMessage(res.error ?? "เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกหนี้");
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
              <div className="size-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  เพิ่มข้อมูลลูกหนี้ใหม่
                </h3>
                <p className="text-xs text-zinc-500">
                  เพิ่มเสร็จแล้วจะเลือกลูกหนี้คนนี้เพื่อเปิดสัญญาให้อัตโนมัติทันที
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

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                ชื่อ-นามสกุล ลูกหนี้ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น นายสมชาย หมายมั่น"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="เช่น 0812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-xs font-mono font-medium text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700">
                    เลขบัตร ปชช. 13 หลัก <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateCitizenId}
                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    สุ่มเลขตัวอย่าง
                  </button>
                </div>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="เลข 13 หลัก"
                    value={citizenId}
                    onChange={(e) => setCitizenId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-xs font-mono font-medium text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  สถานที่ทำงาน / อาชีพ (ตามตัว)
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="เช่น ร้านกาแฟ ตลาดสด ซอย 4"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เพดานวงเงินกู้สูงสุด (บาท)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="2000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-xs font-bold text-zinc-900 tabular-nums focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              type="submit"
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-xs font-bold text-white shadow-md transition-all hover:bg-zinc-800 disabled:opacity-50 select-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>บันทึกลูกหนี้และเลือกเปิดสัญญาทันที</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
