"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarCheck, Users, PlusCircle, Wallet, History } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface BottomNavProps {
  currentRole: "OWNER" | "AGENT";
  badgeCount?: number;
}

export function BottomNav({ currentRole, badgeCount }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "ยอดวันนี้",
      href: "/",
      icon: CalendarCheck,
      badge: badgeCount,
    },
    {
      label: "ลูกหนี้",
      href: "/borrowers",
      icon: Users,
    },
    {
      label: "ปล่อยกู้",
      href: "/loans/new",
      icon: PlusCircle,
      isPrimary: true,
    },
    {
      label: currentRole === "OWNER" ? "บัญชีกองกลาง" : "ประวัติรับเงิน",
      href: "/ledger",
      icon: currentRole === "OWNER" ? Wallet : History,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-200/80 bg-white/95 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => triggerHaptic("medium")}
                className="group relative -top-4 flex flex-col items-center select-none"
              >
                <motion.div
                  whileTap={{ scale: 0.90 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex size-13 items-center justify-center rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800 text-white shadow-xl shadow-zinc-900/35 ring-4 ring-white"
                >
                  <Icon className="size-6 stroke-[2.4]" />
                </motion.div>
                <span className="mt-0.5 text-[10px] font-bold text-zinc-800 tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic("selection")}
              className="relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl select-none"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                className="relative flex flex-col items-center"
              >
                {isActive && (
                  <>
                    <motion.div
                      layoutId="activeBottomTab"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="absolute -inset-x-2.5 -inset-y-1 rounded-2xl bg-zinc-100/90 -z-10"
                    />
                    <motion.div
                      layoutId="activeBottomBar"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-zinc-900"
                    />
                  </>
                )}

                <div className="relative">
                  <Icon
                    className={`size-5 transition-colors duration-200 ${
                      isActive
                        ? "text-zinc-950 stroke-[2.3]"
                        : "text-zinc-400 stroke-[1.8]"
                    }`}
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`mt-1 text-[11px] leading-tight transition-colors duration-200 ${
                    isActive ? "font-bold text-zinc-950" : "font-medium text-zinc-400"
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
