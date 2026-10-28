"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  UserCheck, 
  CalendarCheck, 
  Users, 
  PlusCircle, 
  Wallet, 
  History,
  LogOut,
  Eye,
  EyeOff
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { usePrivacyMode } from "@/lib/privacy";

interface HeaderProps {
  currentRole: "OWNER" | "AGENT";
  onRoleToggle?: () => void;
  userName?: string;
}

export function Header({ currentRole, userName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { isPrivacy, togglePrivacy } = usePrivacyMode();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutAction();
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setIsLoggingOut(false);
    }
  };

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
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md pt-[max(env(safe-area-inset-top),0.35rem)] shadow-2xs transition-colors duration-200">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3.5 sm:px-6">
        {/* Left: Brand Logo & Title with Hover Transition */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group select-none transition-transform duration-200 hover:scale-[1.01]"
          >
            <div className="flex size-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 text-white font-extrabold text-xs shadow-sm ring-1 ring-zinc-900/10 group-hover:shadow-md transition-all">
              LT
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
                  LoanTracker
                </span>
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-600 border border-zinc-200/80">
                  PWA
                </span>
                {/* Live Sync Status Indicator */}
                <span 
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200/80" 
                  title="ระบบออนไลน์และเชื่อมโยงข้อมูลล่าสุดอัตโนมัติ"
                >
                  <span className="relative flex size-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Sync</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate hidden sm:block">
                {userName ?? (currentRole === "OWNER" ? "farafull (นายทุน)" : "agent1 (สายตรวจ)")}
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
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

        {/* Right: Role Badge & Logout Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Privacy Mode Toggle */}
          <button
            type="button"
            onClick={togglePrivacy}
            title={isPrivacy ? "ปิดโหมดซ่อนยอดเงิน (แสดงตัวเลข)" : "เปิดโหมดซ่อนยอดเงิน (Privacy Mode)"}
            className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 sm:px-3 border transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs select-none ${
              isPrivacy
                ? "border-amber-300 bg-amber-50 text-amber-800 ring-2 ring-amber-400/20 hover:bg-amber-100"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {isPrivacy ? (
              <>
                <EyeOff className="size-3.5 text-amber-700" />
                <span className="text-[11px] font-bold hidden xs:inline">ซ่อนยอด</span>
              </>
            ) : (
              <>
                <Eye className="size-3.5 text-zinc-500" />
                <span className="text-[11px] font-medium hidden xs:inline">แสดงยอด</span>
              </>
            )}
          </button>

          {/* User/Role Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-50/90 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-2xs">
            {currentRole === "OWNER" ? (
              <>
                <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold text-zinc-800">
                  {userName ?? "farafull"}
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 hidden xs:inline">
                  นายทุน
                </span>
              </>
            ) : (
              <>
                <UserCheck className="size-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold text-zinc-800">
                  {userName ?? "agent1"}
                </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800 hidden xs:inline">
                  สายตรวจ
                </span>
              </>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            type="button"
            title="ออกจากระบบ"
            className="flex items-center gap-1 rounded-full border border-rose-200/90 bg-rose-50/80 px-2.5 py-1 text-xs font-bold text-rose-700 transition-all duration-150 hover:bg-rose-100 hover:border-rose-300 active:scale-95 cursor-pointer disabled:opacity-50 select-none shadow-2xs"
          >
            <LogOut className="size-3.5" />
            <span className="text-[11px] hidden xs:inline">
              {isLoggingOut ? "กำลังออก..." : "ออก"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
