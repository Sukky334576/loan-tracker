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
  X,
  Camera,
  Image as ImageIcon,
  Check,
  MessageCircle,
  Receipt
} from "lucide-react";
import { updateBorrowerAction } from "@/app/actions/borrowers";
import { formatLineReminderText } from "@/lib/line-reminder";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { motion, AnimatePresence } from "motion/react";

export interface BorrowerPaymentItem {
  id: string;
  amountPaid: number;
  paidAt: string;
  slipUrl?: string;
  paymentType: string;
}

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
  payments?: BorrowerPaymentItem[];
}

export interface BorrowerProfileData {
  id: string;
  citizenId: string;
  fullName: string;
  nickname?: string | null;
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
  idCardPhoto?: string | null;
  storeOrHomePhoto?: string | null;
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
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>("");
  const [copiedLoanId, setCopiedLoanId] = useState<string | null>(null);

  // Edit form state
  const [editFullName, setEditFullName] = useState(data.fullName);
  const [editNickname, setEditNickname] = useState(data.nickname ?? "");
  const [editPhone, setEditPhone] = useState(data.phone);
  const [editWorkplace, setEditWorkplace] = useState(data.workplace ?? "");
  const [editAddress, setEditAddress] = useState(data.addressOnCard ?? "");
  const [editBackupPhone, setEditBackupPhone] = useState(data.backupPhone ?? "");
  const [editFacebookUrl, setEditFacebookUrl] = useState(data.facebookUrl ?? "");
  const [editCreditGrade, setEditCreditGrade] = useState<"NEW" | "GOOD" | "VIP" | "WATCHLIST" | "BLACKLIST">(
    (data.creditGrade as any) || "NEW"
  );
  const [editCreditLimit, setEditCreditLimit] = useState(data.creditLimit.toString());
  const [editGuarantorName, setEditGuarantorName] = useState(data.guarantorName ?? "");
  const [editGuarantorPhone, setEditGuarantorPhone] = useState(data.guarantorPhone ?? "");
  const [editIdCardPhoto, setEditIdCardPhoto] = useState<string | null>(data.idCardPhoto ?? null);
  const [editStorePhoto, setEditStorePhoto] = useState<string | null>(data.storeOrHomePhoto ?? null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageToDataUrl(file, 1200, 1200, 0.75);
        setEditIdCardPhoto(compressed);
      } catch (err) {
        console.error("ID Card compression error:", err);
      }
    }
  };

  const handleStorePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageToDataUrl(file, 1200, 1200, 0.75);
        setEditStorePhoto(compressed);
      } catch (err) {
        console.error("Store photo compression error:", err);
      }
    }
  };

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
      nickname: editNickname.trim() || undefined,
      phone: editPhone.trim(),
      workplace: editWorkplace.trim() || undefined,
      addressOnCard: editAddress.trim() || undefined,
      backupPhone: editBackupPhone.trim() || undefined,
      facebookUrl: editFacebookUrl.trim() || undefined,
      creditGrade: editCreditGrade,
      creditLimit: limitNum,
      guarantorName: editGuarantorName.trim() || undefined,
      guarantorPhone: editGuarantorPhone.trim() || undefined,
      idCardPhoto: editIdCardPhoto || undefined,
      storeOrHomePhoto: editStorePhoto || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setData((prev) => ({
        ...prev,
        fullName: editFullName.trim(),
        nickname: editNickname.trim() || null,
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
        idCardPhoto: editIdCardPhoto,
        storeOrHomePhoto: editStorePhoto,
      }));
      setIsEditModalOpen(false);
      router.refresh();
    } else {
      setEditError(res.error ?? "แก้ไขข้อมูลล้มเหลว");
    }
  };

  const handleCopyLineReminder = async (loan: BorrowerLoanItem) => {
    const now = new Date();
    const due = new Date(loan.currentDueDate);
    const diffTime = due.getTime() - now.setHours(0,0,0,0);
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const cycleInterest = loan.remainingPrincipal * loan.interestRate;

    const text = formatLineReminderText({
      borrowerName: data.fullName,
      nickname: data.nickname,
      remainingPrincipal: loan.remainingPrincipal,
      cycleInterest,
      penaltyAccrued: loan.penaltyAccrued,
      currentDueDate: loan.currentDueDate,
      daysDiff,
      status: loan.status,
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopiedLoanId(loan.id);
      setTimeout(() => setCopiedLoanId(null), 2500);
    } catch {
      // Fallback
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
        {(() => {
          const initials = (data.nickname && data.nickname.trim()) || data.fullName.trim().slice(0, 2) || "LT";
          const tierStyles = {
            VIP: {
              ring: "ring-2 ring-purple-400/80 shadow-purple-100",
              bg: "bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 text-white",
              badge: "bg-purple-100 text-purple-800 border-purple-200 font-black shadow-2xs",
            },
            GOOD: {
              ring: "ring-2 ring-emerald-400/80 shadow-emerald-100",
              bg: "bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 text-white",
              badge: "bg-emerald-100 text-emerald-800 border-emerald-200 font-black shadow-2xs",
            },
            NEW: {
              ring: "ring-2 ring-blue-300 shadow-blue-100",
              bg: "bg-gradient-to-br from-blue-500 via-sky-600 to-indigo-600 text-white",
              badge: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
            },
            WATCHLIST: {
              ring: "ring-2 ring-amber-400/80 shadow-amber-100",
              bg: "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 text-white",
              badge: "bg-amber-100 text-amber-900 border-amber-300 font-black tracking-wide",
            },
            BLACKLIST: {
              ring: "ring-2 ring-rose-500 shadow-rose-100",
              bg: "bg-gradient-to-br from-rose-700 via-red-700 to-rose-900 text-white",
              badge: "bg-rose-100 text-rose-900 border-rose-300 font-black tracking-wide animate-pulse",
            },
          }[data.creditGrade] ?? {
            ring: "ring-2 ring-zinc-300",
            bg: "bg-zinc-700 text-white",
            badge: "bg-zinc-100 text-zinc-700 border-zinc-200 font-medium",
          };

          return (
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl font-black text-sm uppercase shadow-xs transition-transform duration-200 ${tierStyles.bg} ${tierStyles.ring}`}>
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-black tracking-tight text-zinc-900">
                        {data.fullName}
                      </h1>
                      {data.nickname && (
                        <span className="text-sm font-semibold text-zinc-500">
                          ({data.nickname})
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs border ${tierStyles.badge}`}
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
          );
        })()}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {/* Contact & Personal Info + Photos */}
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

            {/* Document & Slip Photos Card (Feature 2.3) */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-xs shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Camera className="size-4 text-zinc-500" />
                  <span>ภาพถ่ายหลักฐานในระบบ</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  + เพิ่มรูป
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* ID Card Thumbnail */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500">บัตรประชาชน</span>
                  {data.idCardPhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImageUrl(data.idCardPhoto!);
                        setPreviewImageTitle(`ภาพบัตรประชาชน — ${data.fullName}`);
                      }}
                      className="group relative h-24 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 hover:border-zinc-400 transition-all cursor-pointer"
                    >
                      <img
                        src={data.idCardPhoto}
                        alt="ID Card"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        แตะดูรูปเต็ม
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-zinc-400 text-[10px]">
                      <CreditCard className="size-5 mb-1 text-zinc-300" />
                      <span>ยังไม่มีรูป</span>
                    </div>
                  )}
                </div>

                {/* Store/Home Thumbnail */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500">หน้าร้าน / บ้าน</span>
                  {data.storeOrHomePhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImageUrl(data.storeOrHomePhoto!);
                        setPreviewImageTitle(`ภาพหน้าร้าน/ที่พัก — ${data.fullName}`);
                      }}
                      className="group relative h-24 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 hover:border-zinc-400 transition-all cursor-pointer"
                    >
                      <img
                        src={data.storeOrHomePhoto}
                        alt="Store/Home"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        แตะดูรูปเต็ม
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-zinc-400 text-[10px]">
                      <ImageIcon className="size-5 mb-1 text-zinc-300" />
                      <span>ยังไม่มีรูป</span>
                    </div>
                  )}
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
                <div className="relative pl-6 sm:pl-7 before:absolute before:left-2.5 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 space-y-3.5">
                  {data.loans.map((loan) => {
                    const isSettled = loan.status === "SETTLED";
                    const isBadDebt = loan.status === "BAD_DEBT";
                    const isOverdue = loan.status === "OVERDUE";
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
                      <div key={loan.id} className="relative">
                        {/* Timeline Node Indicator */}
                        <div className={`absolute -left-6 sm:-left-7 top-3.5 size-3.5 rounded-full border-2 border-white shadow-2xs ${
                          isSettled
                            ? "bg-emerald-500"
                            : isBadDebt
                            ? "bg-rose-600"
                            : isOverdue
                            ? "bg-amber-500 animate-pulse"
                            : "bg-blue-600"
                        }`} />

                        <div
                          className={`flex flex-col gap-2 rounded-2xl border p-3.5 sm:p-4 transition-all shadow-xs ${
                            isSettled
                              ? "border-emerald-200/80 bg-emerald-50/20"
                              : isBadDebt
                              ? "border-rose-200/80 bg-rose-50/20"
                              : "border-zinc-200 bg-zinc-50/70 hover:bg-white"
                          }`}
                        >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900">
                                สัญญา {loan.termType === "DAYS_7" ? "รอบ 7 วัน" : loan.termType === "DAYS_10" ? "รอบ 10 วัน" : "กำหนดเอง"}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isSettled
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isBadDebt
                                    ? "bg-rose-200 text-rose-900"
                                    : loan.status === "OVERDUE"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {isSettled ? "ปิดยอดแล้ว ✅" : isBadDebt ? "หนี้สูญ ❌" : loan.status === "OVERDUE" ? "เกินกำหนด ⚠️" : "กำลังผ่อนชำระ"}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                              <span>วันที่เปิด: {createdDateStr}</span>
                              <span>ครบกำหนด: {dueDateStr}</span>
                              <span>ต่อดอกแล้ว: {loan.rolloverCount}/3 รอบ</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-400">เงินต้นค้าง / เงินต้นกู้</span>
                              <p className="font-mono text-xs font-bold tabular-nums text-zinc-900">
                                {loan.remainingPrincipal.toLocaleString()} / {loan.initialPrincipal.toLocaleString()} ฿
                              </p>
                            </div>

                            {/* 1-Click Copy LINE Reminder (Feature 1.1) */}
                            {!isSettled && !isBadDebt && (
                              <button
                                type="button"
                                onClick={() => handleCopyLineReminder(loan)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="คัดลอกข้อความแจ้งยอดส่ง LINE"
                              >
                                {copiedLoanId === loan.id ? (
                                  <>
                                    <Check className="size-3 text-emerald-700" />
                                    <span>คัดลอกแล้ว!</span>
                                  </>
                                ) : (
                                  <>
                                    <MessageCircle className="size-3 text-emerald-600" />
                                    <span>แจ้งยอด LINE</span>
                                  </>
                                )}
                              </button>
                            )}

                            <Link
                              href={`/loans/${loan.id}/contract`}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                            >
                              <FileText className="size-3.5" />
                              <span>สัญญา</span>
                            </Link>
                          </div>
                        </div>

                        {/* Payment Slips in Loan History (Feature 2.3) */}
                        {loan.payments && loan.payments.some((p) => p.slipUrl && p.slipUrl !== "/slip-placeholder.png") && (
                          <div className="mt-2 border-t border-zinc-200/80 pt-2 flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                              <Receipt className="size-3 text-emerald-600" />
                              <span>สลิปการโอนเงิน:</span>
                            </span>
                            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                              {loan.payments
                                .filter((p) => p.slipUrl && p.slipUrl !== "/slip-placeholder.png")
                                .map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setPreviewImageUrl(p.slipUrl!);
                                      setPreviewImageTitle(`สลิปชำระเงิน ${p.amountPaid.toLocaleString()} ฿ — ${new Date(p.paidAt).toLocaleDateString("th-TH")}`);
                                    }}
                                    className="group relative size-7 rounded-md overflow-hidden border border-zinc-300 hover:border-zinc-500 shrink-0 cursor-pointer"
                                    title="แตะดูภาพสลิป"
                                  >
                                    <img src={p.slipUrl} alt="Slip" className="size-full object-cover" />
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
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

      {/* Image Lightbox Modal (Feature 2.3) */}
      <AnimatePresence>
        {previewImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImageUrl(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 max-h-[90vh] max-w-lg w-full rounded-2xl bg-white p-4 shadow-2xl flex flex-col items-center"
            >
              <div className="flex w-full items-center justify-between pb-2 border-b border-zinc-150 mb-3">
                <span className="text-xs font-bold text-zinc-900 truncate">
                  {previewImageTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(null)}
                  className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="w-full max-h-[70vh] overflow-auto rounded-xl flex items-center justify-center bg-zinc-950">
                <img
                  src={previewImageUrl}
                  alt="Full preview"
                  className="max-h-[68vh] w-auto object-contain"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
            >
              {/* Grab handle for mobile */}
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300/80 hover:bg-zinc-400 transition-colors sm:hidden cursor-grab" />

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
                  className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 transition-colors cursor-pointer"
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

              <form onSubmit={handleSaveBorrower} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      ระดับเครดิต (Tier) {userRole !== "OWNER" && <span className="text-[10px] text-amber-600 font-normal">(เฉพาะนายทุน)</span>}
                    </label>
                    <select
                      value={editCreditGrade}
                      disabled={userRole !== "OWNER"}
                      onChange={(e) => setEditCreditGrade(e.target.value as any)}
                      className={`h-11 w-full rounded-xl border px-3 text-xs font-bold text-zinc-900 focus:outline-none shadow-2xs transition-all ${
                        userRole !== "OWNER" 
                          ? "border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed" 
                          : "border-zinc-200 bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 cursor-pointer"
                      }`}
                    >
                      <option value="NEW">NEW (ผู้กู้ใหม่)</option>
                      <option value="GOOD">GOOD (ชั้นดี/ตรงเวลา 3 สัญญา)</option>
                      <option value="VIP">VIP (ลูกค้า VIP/ตรงเวลา 6 สัญญา)</option>
                      <option value="WATCHLIST">WATCHLIST (เฝ้าระวัง/มีประวัติค้าง)</option>
                      <option value="BLACKLIST">BLACKLIST (ติดแบล็กลิสต์/ห้ามกู้)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      เพดานวงเงินกู้สูงสุด (บาท) {userRole !== "OWNER" && <span className="text-[10px] text-amber-600 font-normal">(เฉพาะนายทุน)</span>}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      disabled={userRole !== "OWNER"}
                      value={editCreditLimit}
                      onChange={(e) => setEditCreditLimit(e.target.value)}
                      className={`h-11 w-full rounded-xl border px-3 font-mono text-xs font-bold text-zinc-900 focus:outline-none shadow-2xs transition-all ${
                        userRole !== "OWNER" 
                          ? "border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed" 
                          : "border-zinc-200 bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      ชื่อเล่น
                    </label>
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="เช่น เอก"
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
                    />
                  </div>
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
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-mono text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
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
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-mono text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
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
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
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
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
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
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
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
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-mono text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Photo Update Fields */}
                <div className="grid grid-cols-2 gap-2.5 border-t border-zinc-150 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      อัปเดตรูปบัตรประชาชน
                    </label>
                    <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-2 text-center hover:bg-zinc-100">
                      {editIdCardPhoto ? (
                        <span className="text-[10px] font-bold text-emerald-700">✓ แนบรูปแล้ว (แตะเปลี่ยน)</span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">แตะเพื่อถ่าย/เลือกรูป</span>
                      )}
                      <input type="file" accept="image/*" onChange={handleIdCardUpload} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      อัปเดตรูปหน้าร้าน/บ้าน
                    </label>
                    <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-2 text-center hover:bg-zinc-100">
                      {editStorePhoto ? (
                        <span className="text-[10px] font-bold text-emerald-700">✓ แนบรูปแล้ว (แตะเปลี่ยน)</span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">แตะเพื่อถ่าย/เลือกรูป</span>
                      )}
                      <input type="file" accept="image/*" onChange={handleStorePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-150 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
