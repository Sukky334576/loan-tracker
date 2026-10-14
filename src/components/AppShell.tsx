"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SessionUser, loginAction } from "@/app/actions/auth";

interface RoleContextType {
  role: "OWNER" | "AGENT";
  user: SessionUser | null;
  toggleRole: () => void;
}

const RoleContext = createContext<RoleContextType>({
  role: "OWNER",
  user: null,
  toggleRole: () => {},
});

export const useRole = () => useContext(RoleContext);

export function AppShell({
  children,
  initialSession = null,
}: {
  children: React.ReactNode;
  initialSession?: SessionUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(initialSession);
  const [role, setRole] = useState<"OWNER" | "AGENT">(initialSession?.role ?? "OWNER");

  useEffect(() => {
    if (initialSession) {
      setUser(initialSession);
      setRole(initialSession.role);
    }
  }, [initialSession]);

  const toggleRole = async () => {
    const nextRole = role === "OWNER" ? "AGENT" : "OWNER";
    setRole(nextRole);
    const res = await loginAction({ role: nextRole, isQuickLogin: true });
    if (res.success && res.user) {
      setUser(res.user);
    }
    router.refresh();
  };

  const isCustomerSignMode = pathname?.startsWith("/sign");
  const isLoginPage = pathname === "/login";
  const hideChrome = isCustomerSignMode || isLoginPage;

  return (
    <RoleContext.Provider value={{ role, user, toggleRole }}>
      <div className="flex min-h-dvh flex-col bg-slate-50 text-zinc-900">
        {/* Header อยู่ถาวร ไม่ถูก unmount เวลาเปลี่ยนหน้า (ซ่อนในหน้า Login และหน้าเซ็นชื่อของลูกค้า) */}
        {!hideChrome && (
          <Header
            currentRole={role}
            onRoleToggle={toggleRole}
            userName={user?.name}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 w-full">
          {children}
        </div>

        {/* Bottom Nav สำหรับ Mobile อยู่ถาวร ไม่ถูก unmount (ซ่อนในหน้า Login และหน้าเซ็นชื่อของลูกค้า) */}
        {!hideChrome && <BottomNav currentRole={role} />}
      </div>
    </RoleContext.Provider>
  );
}
