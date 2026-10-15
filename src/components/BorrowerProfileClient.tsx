"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Phone, 
  CreditCard, 
  MapPin, 
  Briefcase, 
  Shield, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Clock, 
  TrendingUp, 
  DollarSign,
  User,
  ExternalLink,
  Loader2,
  X
} from "lucide-react";
import { updateBorrowerAction } from "@/app/actions/borrowers";
import { motion, AnimatePresence } from "motion/react";

export interface BorrowerLoanItem {
  id: string;
  initialPrincipal: number;
  remainingPrincipal: number;
  termType: string;
  interestRate: number;
  status: string;
  rolloverCount: number;
  penaltyAccrued: number;
  currentDueDate: string;
  createdAt: string;
  closedAt: string | null;
  paymentsCount: number;
  totalPaid: number;
}

export interface BorrowerProfileData {
  id: string;
  citizenId: string;
  fullName: string;
  phone: string;
  workplace: string | null;
  addressOnCard: string | null;
  facebookUrl: string | null;
  backupPhone: string | null;
  creditGrade: string;
  creditLimit: number;
  completedCycles: number;
  createdAt: string;
  guarantorName: string | null;
  guarantorPhone: string | null;
  activePrincipal: number;
  availableCredit: number;
  loans: BorrowerLoanItem[];
}

interface Props {
  borrower: BorrowerProfileData;
  userRole: "OWNER" | "AGENT";
}

export function BorrowerProfileClient({ borrower, userRole }: Props) {
  const router = useRouter();
  const [data, setData] = useState<BorrowerProfileData>(borrower);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit form state
  const [editFullName, setEditFullName] = useState(data.fullName);
  const [editPhone, setEditPhone] = useState(data.phone);
  const [editWorkplace, setEditWorkplace] = useState(data.workplace ?? "");
  const [editAddress, setEditAddress] = useState(data.addressOnCard ?? "");
  const [editBackupPhone, setEditBackupPhone] = useState(data.backupPhone ?? "");
  const [editFacebookUrl, setEditFacebookUrl] = useState(data.facebookUrl ?? "");
  const [editCreditGrade, setEditCreditGrade] = useState<"NEW" | "GOOD" | "BLACKLIST">(
    (data.creditGrade as any) || "NEW"
  );
  const [editCreditLimit, setEditCreditLimit] = useState(data.creditLimit.toString());
  const [editGuarantorName, setEditGuarantorName] = useState(data.guarantorName ?? "");
  const [editGuarantorPhone, setEditGuarantorPhone] = useState(data.guarantorPhone ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSaveBorrower = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEditError(null);

    const limitNum = Number(editCreditLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      setEditError("กรุณาระบุเพดานวงเงินให้ถูกต้อง");
      setIsSubmitting(false);
      return;
    }

    const res = await updateBorrowerAction({
      borrowerId: data.id,
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      workplace: editWorkplace.trim() || undefined,
      addressOnCard: editAddress.trim() || undefined,
      backupPhone: editBackupPhone.trim() || undefined,
      facebookUrl: editFacebookUrl.trim() || undefined,
      creditGrade: editCreditGrade,
      creditLimit: limitNum,
      guarantorName: editGuarantorName.trim() || undefined,
      guarantorPhone: editGuarantorPhone.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setData((prev) => ({
        ...prev,
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        workplace: editWorkplace.trim() || null,
        addressOnCard: editAddress.trim() || null,
        backupPhone: editBackupPhone.trim() || null,
        facebookUrl: editFacebookUrl.trim() || null,
        creditGrade: editCreditGrade,
        creditLimit: limitNum,
        availableCredit: Math.max(0, limitNum - prev.activePrincipal),
        guarantorName: editGuarantorName.trim() || null,
        guarantorPhone: editGuarantorPhone.trim() || null,
      }));
      setIsEditModalOpen(false);
      router.refresh();
    } else {
      setEditError(res.error ?? "แก้ไขข้อมูลล้มเหลว");
    }
  };

  return (
    <div className="w-full pb-24 md:pb-12">
      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-5">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/borrowers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors py-1 px-2 rounded-lg hover:bg-zinc-100"
          >
            <ArrowLeft className="size-4" />
            <span>กลับหน้ารายชื่อผู้กู้</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <Edit3 className="size-3.5" />
              <span>แก้ไขข้อมูล / ปรับวงเงิน</span>
            </button>

            <Link
              href="/loans/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>เปิดสัญญาใหม่</span>
            </Link>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="size-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {data.fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                    {data.fullName}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                      data.creditGrade === "GOOD"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : data.creditGrade === "BLACKLIST"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                    }`}
                  >
                    ระดับ: {data.creditGrade}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-500">
                  <span className="flex items-center gap-1 font-mono">
                    <CreditCard className="size-3.5 text-zinc-400" />
                    {data.citizenId}
                  </span>
                  <a
                    href={`tel:${data.phone}`}
                    className="flex items-center gap-1 font-mono text-emerald-700 font-bold hover:underline"
                  >
                    <Phone className="size-3.5" />
                    {data.phone}
                  </a>
                  {data.workplace && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="size-3.5 text-zinc-400" />
                      {data.workplace}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Key Financial Badges Grid */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-zinc-150 pt-4">
            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/70">
              <span className="text-[11px] font-medium text-zinc-500">เพดานวงเงินกู้</span>
              <p className="font-mono text-base font-bold tabular-nums text-zinc-900 mt-0.5">
                {data.creditLimit.toLocaleString()} ฿
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/70">
              <span className="text-[11px] font-medium text-zinc-500">วงเงินคงเหลือปล่อยได้</span>
              <p className={`font-mono text-base font-bold tabular-nums mt-0.5 ${
                data.availableCredit > 0 ? "text-emerald-700" : "text-rose-700"
              }`}>
                {data.availableCredit.toLocaleString()} ฿
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/70">
              <span className="text-[11px] font-medium text-zinc-500">ยอดหนี้ค้างชำระ</span>
              <p className="font-mono text-base font-bold tabular-nums text-zinc-900 mt-0.5">
                {data.activePrincipal.toLocaleString()} ฿
              </p>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/70">
              <span className="text-[11px] font-medium text-zinc-500">สัญญาที่ปิดแล้ว</span>
              <p className="font-mono text-base font-bold tabular-nums text-emerald-700 mt-0.5">
                {data.completedCycles} รอบ
              </p>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {/* Contact & Personal Info */}
          <div className="md:col-span-1 flex flex-col gap-3.5">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-xs shadow-xs">
              <h3 className="font-bold text-zinc-900 mb-2.5 flex items-center gap-1.5">
                <User className="size-4 text-zinc-500" />
                <span>ข้อมูลติดต่อ & บุคคลอ้างอิง</span>
              </h3>

              <div className="space-y-2 text-zinc-600">
                <div>
                  <span className="text-zinc-400 text-[10px] block">ที่อยู่ตามบัตร / ที่พัก:</span>
                  <p className="font-medium text-zinc-800">{data.addressOnCard || "ไม่ระบุ"}</p>
                </div>

                <div>
                  <span className="text-zinc-400 text-[10px] block">เบอร์โทรศัพท์ฉุกเฉิน / ญาติ:</span>
                  <p className="font-mono font-medium text-zinc-800">{data.backupPhone || "ไม่ระบุ"}</p>
                </div>

                <div>
                  <span className="text-zinc-400 text-[10px] block">Facebook / LINE:</span>
                  <p className="font-medium text-zinc-800 truncate">{data.facebookUrl || "ไม่ระบุ"}</p>
                </div>

                <div className="border-t border-zinc-150 pt-2">
                  <span className="text-zinc-400 text-[10px] block">ผู้รับรอง / ผู้ค้ำประกัน:</span>
                  <p className="font-semibold text-zinc-900">
                    {data.guarantorName ? (
                      <>
                        {data.guarantorName}{" "}
                        {data.guarantorPhone && (
                          <span className="font-mono font-normal text-zinc-500">({data.guarantorPhone})</span>
                        )}
                      </>
                    ) : (
                      "ไม่มีผู้ค้ำประกัน"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Loan History List */}
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  ประวัติสัญญากู้ยืมทั้งหมด ({data.loans.length} รายการ)
                </h3>
              </div>

              {data.loans.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {data.loans.map((loan) => {
                    const isSettled = loan.status === "SETTLED";
                    const createdDateStr = new Date(loan.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    });
                    const dueDateStr = new Date(loan.currentDueDate).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                    });

                    return (
                      <div
                        key={loan.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                          isSettled
                            ? "border-emerald-200/80 bg-emerald-50/20"
                            : "border-zinc-200 bg-zinc-50/70"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">
                              สัญญา {loan.termType === "DAYS_7" ? "รอบ 7 วัน" : loan.termType === "DAYS_10" ? "รอบ 10 วัน" : "กำหนดเอง"}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isSettled
                                  ? "bg-emerald-100 text-emerald-800"
                                  : loan.status === "OVERDUE"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isSettled ? "ปิดยอดแล้ว ✅" : loan.status === "OVERDUE" ? "เกินกำหนด ⚠️" : "กำลังผ่อนชำระ"}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                            <span>วันที่เปิด: {createdDateStr}</span>
                            <span>ครบกำหนด: {dueDateStr}</span>
                            <span>ต่อดอกแล้ว: {loan.rolloverCount}/3 รอบ</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-400">เงินต้นค้าง / เงินต้นกู้</span>
                            <p className="font-mono text-xs font-bold tabular-nums text-zinc-900">
                              {loan.remainingPrincipal.toLocaleString()} / {loan.initialPrincipal.toLocaleString()} ฿
                            </p>
                          </div>

                          <Link
                            href={`/loans/${loan.id}/contract`}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            <FileText className="size-3.5" />
                            <span>สัญญา</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400">
                  ยังไม่มีประวัติการกู้ยืมเงิน
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Borrower & Credit Adjustment Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
                <div className="flex items-center gap-2">
                  <Edit3 className="size-4 text-zinc-700" />
                  <h3 className="text-base font-bold text-zinc-900">
                    แก้ไขข้อมูล & ปรับวงเงินผู้กู้
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {editError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveBorrower} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      ระดับเครดิต (Tier)
                    </label>
                    <select
                      value={editCreditGrade}
                      onChange={(e) => setEditCreditGrade(e.target.value as any)}
                      className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-900 focus:outline-none"
                    >
                      <option value="NEW">NEW (ผู้กู้ใหม่)</option>
                      <option value="GOOD">GOOD (ชั้นดี/ประวัติดี)</option>
                      <option value="BLACKLIST">BLACKLIST (ติดแบล็กลิสต์/ห้ามกู้)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      เพดานวงเงินกู้สูงสุด (บาท)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={editCreditLimit}
                      onChange={(e) => setEditCreditLimit(e.target.value)}
                      className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 font-mono text-xs font-bold text-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs font-mono text-zinc-900 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      เบอร์โทรสำรอง / ญาติ
                    </label>
                    <input
                      type="tel"
                      value={editBackupPhone}
                      onChange={(e) => setEditBackupPhone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs font-mono text-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ที่ทำงาน / สถานที่ตามตัว
                  </label>
                  <input
                    type="text"
                    value={editWorkplace}
                    onChange={(e) => setEditWorkplace(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ที่อยู่ตามบัตรประชาชน / ที่พัก
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      ชื่อผู้ค้ำประกัน
                    </label>
                    <input
                      type="text"
                      value={editGuarantorName}
                      onChange={(e) => setEditGuarantorName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      เบอร์ผู้ค้ำประกัน
                    </label>
                    <input
                      type="tel"
                      value={editGuarantorPhone}
                      onChange={(e) => setEditGuarantorPhone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs font-mono text-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-150 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        <span>บันทึกการเปลี่ยนแปลง</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
