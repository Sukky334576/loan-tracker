import { prisma } from "@/lib/prisma";
import { Phone, Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BorrowersPage() {
  const borrowers = await prisma.borrower.findMany({
    where: { deletedAt: null },
    include: {
      loans: {
        where: { deletedAt: null },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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

          <Link
            href="/loans/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-zinc-800 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-95 select-none"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>เปิดสัญญาใหม่</span>
          </Link>
        </div>

        {/* Responsive Grid with Smooth Hover Lift */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {borrowers.map((b) => {
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

                  <a
                    href={`tel:${b.phone}`}
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold transition-all duration-150 hover:translate-x-0.5 active:scale-95"
                  >
                    <span>โทรหา</span>
                    <ArrowUpRight className="size-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
