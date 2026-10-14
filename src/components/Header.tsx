"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck, 
  UserCheck, 
  CalendarCheck, 
  Users, 
  PlusCircle, 
  Wallet, 
  History 
} from "lucide-react";

interface HeaderProps {
  currentRole: "OWNER" | "AGENT";
  onRoleToggle?: () => void;
  userName?: string;
}

export function Header({ currentRole, onRoleToggle, userName }: HeaderProps) {
  const pathname = usePathname();

  const desktopNavItems = [
    { label: "ยอดวันนี้", href: "/", icon: CalendarCheck },
    { label: "ลูกหนี้", href: "/borrowers", icon: Users },
    { label: "ปล่อยกู้ใหม่", href: "/loans/new", icon: PlusCircle },
    { 
      label: currentRole === "OWNER" ? "บัญชีกองกลาง" : "ประวัติรับเงิน", 
      href: "/ledger", 
      icon: currentRole === "OWNER" ? Wallet : History 
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/90 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top)] shadow-xs transition-colors duration-200">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Logo & Title with Hover Transition */}
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group select-none transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-xs shadow-sm transition-all duration-200 group-hover:bg-zinc-800 group-hover:shadow-md">
              LT
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
                  LoanTracker
                </span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 border border-zinc-200">
                  PWA
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate hidden sm:block">
                {userName ?? (currentRole === "OWNER" ? "น.ส.ฟิลิปดา (นายทุน)" : "สมชาย สายตรวจ")}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links with Smooth Hover & Active States */}
          <nav className="hidden md:flex items-center gap-1.5">
            {desktopNavItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-xs scale-100"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80 hover:-translate-y-0.5 hover:shadow-2xs active:translate-y-0 active:scale-95"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Role Switcher Badge with Smooth Hover */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRoleToggle}
            type="button"
            aria-label="สลับสิทธิ์การใช้งาน"
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-100 hover:border-zinc-300 hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer select-none"
          >
            {currentRole === "OWNER" ? (
              <>
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold">โหมด: นายทุน</span>
              </>
            ) : (
              <>
                <UserCheck className="size-3.5 text-blue-600" />
                <span className="text-[11px] font-bold">โหมด: สายตรวจ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
