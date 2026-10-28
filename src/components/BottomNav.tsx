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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-200/90 bg-white/95 backdrop-blur-md pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
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
                className="group relative -top-3.5 flex flex-col items-center select-none"
              >
                <motion.div
                  whileTap={{ scale: 0.90 }}
                  className="flex size-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/25 border-2 border-white"
                >
                  <Icon className="size-6 stroke-[2.2]" />
                </motion.div>
                <span className="mt-0.5 text-[10px] font-bold text-zinc-800">
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
              className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl select-none"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                className="relative flex flex-col items-center"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomTab"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="absolute -inset-x-2 -inset-y-1 rounded-xl bg-zinc-100 -z-10"
                  />
                )}

                <div className="relative">
                  <Icon
                    className={`size-5 transition-colors duration-200 ${
                      isActive
                        ? "text-zinc-950 stroke-[2.2]"
                        : "text-zinc-400 stroke-[1.8]"
                    }`}
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
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
