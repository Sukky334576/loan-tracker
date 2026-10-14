"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBorrowerAction } from "@/app/actions/borrowers";
import { 
  ArrowLeft, 
  UserPlus, 
  Phone, 
  CreditCard, 
  MapPin, 
  Share2, 
  ShieldCheck, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

function BorrowerFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from") || "/borrowers";

  const [formData, setFormData] = useState({
    citizenId: "",
    fullName: "",
    phone: "",
    workplace: "",
    addressOnCard: "",
    facebookUrl: "",
    backupPhone: "",
    creditGrade: "NEW" as "NEW" | "GOOD" | "BLACKLIST",
    creditLimit: 2000,
    guarantorName: "",
    guarantorPhone: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.citizenId.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุล, เบอร์โทร และเลขบัตรประชาชน");
      return;
    }

    if (formData.citizenId.replace(/\D/g, "").length !== 13) {
      setErrorMsg("เลขประจำตัวประชาชนต้องครบ 13 หลัก");
      return;
    }

    setIsSubmitting(true);
    const res = await createBorrowerAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      router.push(fromUrl);
      router.refresh();
    } else {
      setErrorMsg(res.error ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="w-full pb-24 md:pb-12">
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-5">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href={fromUrl}
            className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 transition-all active:scale-95"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              ลงทะเบียนลูกหนี้ใหม่
            </h2>
            <p className="text-xs text-zinc-500">
              บันทึกข้อมูลส่วนตัว ประวัติเครดิต และช่องทางติดตามตัว
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Card 1: ข้อมูลบัตรประชาชน & พื้นฐาน */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CreditCard className="size-4 text-zinc-500" />
              <span>ข้อมูลประจำตัว</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เลขบัตรประชาชน 13 หลัก *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="เช่น 1100200300401"
                  value={formData.citizenId}
                  onChange={(e) =>
                    setFormData({ ...formData, citizenId: e.target.value.replace(/\D/g, "") })
                  }
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 font-mono text-sm text-zinc-900 tabular-nums focus:bg-white focus:border-zinc-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  ชื่อ-นามสกุล (ตรงตามบัตร) *
                </label>
                <input
                  type="text"
                  placeholder="เช่น นายสมศักดิ์ มั่งคั่ง"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เบอร์โทรศัพท์หลัก *
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="เช่น 081-234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm font-mono text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  สถานที่ทำงาน / แผงค้า
                </label>
                <input
                  type="text"
                  placeholder="เช่น ตลาดรังสิต ล็อค B12"
                  value={formData.workplace}
                  onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  ที่อยู่ตามบัตรประชาชน
                </label>
                <input
                  type="text"
                  placeholder="เช่น 99/12 ต.ประชาธิปัตย์ อ.ธัญบุรี จ.ปทุมธานี"
                  value={formData.addressOnCard}
                  onChange={(e) => setFormData({ ...formData, addressOnCard: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: ข้อมูลตามตัวเชิงลึก & คนค้ำ */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Share2 className="size-4 text-zinc-500" />
              <span>ช่องทางติดตามตัว & คนค้ำประกัน</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  ลิงก์ Facebook / LINE ID
                </label>
                <input
                  type="text"
                  placeholder="เช่น https://facebook.com/username"
                  value={formData.facebookUrl}
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เบอร์โทรสำรอง / เบอร์ญาติ
                </label>
                <input
                  type="tel"
                  placeholder="เช่น 089-111-2233 (พี่สาว)"
                  value={formData.backupPhone}
                  onChange={(e) => setFormData({ ...formData, backupPhone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  ชื่อคนค้ำประกัน (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล คนค้ำ"
                  value={formData.guarantorName}
                  onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เบอร์โทรคนค้ำประกัน
                </label>
                <input
                  type="tel"
                  placeholder="เช่น 089-999-8888"
                  value={formData.guarantorPhone}
                  onChange={(e) => setFormData({ ...formData, guarantorPhone: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 3: วงเงิน & เกรดเครดิต */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-zinc-500" />
              <span>วงเงินและเกรดเครดิต</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เพดานวงเงินกู้สูงสุด (บาท)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="500"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 font-mono text-sm font-bold text-zinc-900 tabular-nums focus:bg-white focus:border-zinc-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  * ลูกค้าใหม่ (NEW) แนะนำไม่เกิน 2,000 บาท
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  เกรดเครดิตเริ่มต้น
                </label>
                <select
                  value={formData.creditGrade}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creditGrade: e.target.value as "NEW" | "GOOD" | "BLACKLIST",
                    })
                  }
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50/70 px-3 text-xs font-bold text-zinc-900 focus:bg-white focus:border-zinc-500 focus:outline-none"
                >
                  <option value="NEW">NEW (ลูกค้าใหม่ เพดาน 2,000)</option>
                  <option value="GOOD">GOOD (ลูกค้าชั้นดี ผ่อนตรง)</option>
                  <option value="BLACKLIST">BLACKLIST (ประวัติติดแบล็กลิสต์)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 select-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>กำลังบันทึกลูกหนี้...</span>
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                <span>บันทึกลงทะเบียนลูกหนี้</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewBorrowerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-zinc-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <BorrowerFormContent />
    </Suspense>
  );
}

