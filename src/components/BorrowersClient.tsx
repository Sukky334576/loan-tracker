"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Plus, ArrowUpRight, Trash2, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { deleteBorrowerAction } from "@/app/actions/borrowers";
import { motion, AnimatePresence } from "motion/react";

export interface BorrowerItem {
  id: string;
  fullName: string;
  phone: string;
  workplace?: string | null;
  creditGrade: string;
  creditLimit: number;
  completedCycles: number;
  loans: {
    id: string;
    remainingPrincipal: number;
    status: string;
  }[];
}

interface BorrowersClientProps {
  initialBorrowers: BorrowerItem[];
}

export function BorrowersClient({ initialBorrowers }: BorrowersClientProps) {
  const router = useRouter();
  const [borrowers, setBorrowers] = useState<BorrowerItem[]>(initialBorrowers);
  const [searchTerm, setSearchTerm] = useState("");
  const [borrowerToDelete, setBorrowerToDelete] = useState<BorrowerItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredBorrowers = borrowers.filter((b) =>
    b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.phone.includes(searchTerm) ||
    (b.workplace && b.workplace.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleConfirmDelete = async () => {
    if (!borrowerToDelete) return;
    setIsDeleting(true);

    const res = await deleteBorrowerAction(borrowerToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      setBorrowers((prev) => prev.filter((b) => b.id !== borrowerToDelete.id));
      setBorrowerToDelete(null);
      router.refresh();
    } else {
      alert(res.error ?? "เกิดข้อผิดพลาดในการลบข้อมูลลูกหนี้");
    }
  };

  return (
    <div className="w-full pb-24 md:pb-12">
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              รายชื่อลูกหนี้ทั้งหมด
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              ฐานข้อมูลลูกหนี้และเพดานวงเงิน ({borrowers.length} รายการ)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/loans/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-zinc-800 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-95 select-none"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>เปิดสัญญาใหม่</span>
            </Link>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-5 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกหนี้, เบอร์โทร, สถานที่ทำงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-xs font-medium text-zinc-900 placeholder-zinc-400 hover:border-zinc-300 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 shadow-2xs transition-all duration-200"
          />
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBorrowers.map((b) => {
            const activeLoans = b.loans.filter((l) =>
              ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"].includes(l.status)
            );
            const totalRemaining = activeLoans.reduce(
              (sum, l) => sum + l.remainingPrincipal,
              0
            );

            return (
              <div
                key={b.id}
                className="group rounded-2xl border border-zinc-200/90 bg-white p-4.5 shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md hover:border-zinc-300"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 truncate group-hover:text-black transition-colors">
                        {b.fullName}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold transition-transform duration-150 group-hover:scale-105 ${
                          b.creditGrade === "GOOD"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : b.creditGrade === "BLACKLIST"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                        }`}
                      >
                        {b.creditGrade}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1.5">
                      <Phone className="size-3 text-zinc-400" />
                      <span>{b.phone}</span>
                    </p>
                    {b.workplace && (
                      <p className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">
                        {b.workplace}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-medium text-zinc-400">เงินต้นค้างรวม</span>
                    <p className="font-mono text-sm font-bold tabular-nums text-zinc-900 group-hover:text-black transition-colors">
                      {totalRemaining.toLocaleString()} ฿
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      วงเงิน {b.creditLimit.toLocaleString()} ฿
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-150 pt-2 text-[11px]">
                  <span className="text-zinc-500">
                    สัญญาที่จบแล้ว:{" "}
                    <strong className="text-zinc-800">{b.completedCycles} รอบ</strong>
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBorrowerToDelete(b)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
                      title="ลบลูกหนี้"
                    >
                      <Trash2 className="size-3.5" />
                      <span>ลบ</span>
                    </button>

                    <a
                      href={`tel:${b.phone}`}
                      className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold transition-all duration-150 hover:translate-x-0.5 active:scale-95"
                    >
                      <span>โทรหา</span>
                      <ArrowUpRight className="size-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {borrowerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setBorrowerToDelete(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200"
            >
              <div className="flex items-start gap-3.5">
                <div className="size-10 shrink-0 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <Trash2 className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-zinc-900">
                    ยืนยันลบข้อมูลลูกหนี้?
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    คุณต้องการลบข้อมูลของ{" "}
                    <strong className="text-zinc-800 font-semibold">{borrowerToDelete.fullName}</strong>{" "}
                    (เบอร์โทร {borrowerToDelete.phone}) ใช่หรือไม่? 
                    ข้อมูลลูกหนี้และสัญญาที่เกี่ยวข้องจะถูกนำออกจากระบบทันที
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-150 pt-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setBorrowerToDelete(null)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>กำลังลบ...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      <span>ลบลูกหนี้</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
