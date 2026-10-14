"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  UserCheck, 
  ArrowRight, 
  Lock, 
  User, 
  Loader2, 
  AlertCircle,
  Sparkles,
  KeyRound
} from "lucide-react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from") || "/";

  const [selectedRole, setSelectedRole] = useState<"OWNER" | "AGENT">("OWNER");
  const [username, setUsername] = useState<string>("owner");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Switch role and update default username
  const handleSelectRole = (role: "OWNER" | "AGENT") => {
    setSelectedRole(role);
    setErrorMessage(null);
    setUsername(role === "OWNER" ? "owner" : "agent1");
    setPassword("");
  };

  // 1-Tap Quick Login
  const handleQuickLogin = async (role: "OWNER" | "AGENT") => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await loginAction({
      role,
      isQuickLogin: true,
    });

    setIsLoading(false);

    if (res.success) {
      router.push(fromUrl);
      router.refresh();
    } else {
      setErrorMessage(res.error ?? "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    }
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage("กรุณากรอกชื่อผู้ใช้งาน");
      return;
    }

    setIsLoading(true);

    const res = await loginAction({
      username: username.trim(),
      password: password.trim(),
      role: selectedRole,
    });

    setIsLoading(false);

    if (res.success) {
      router.push(fromUrl);
      router.refresh();
    } else {
      setErrorMessage(res.error ?? "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/20">
          <span className="text-xl font-bold tracking-tight">LT</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          LoanTracker
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          ระบบบริหารและติดตามเงินกู้ระยะสั้น Mobile PWA
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-7 shadow-sm">
        {/* Role Selector Tabs */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-zinc-700 mb-2">
            เลือกตำแหน่งการใช้งาน
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Owner Tab */}
            <button
              type="button"
              onClick={() => handleSelectRole("OWNER")}
              className={`flex flex-col items-center justify-center rounded-2xl p-3.5 border transition-all active:scale-95 text-left cursor-pointer ${
                selectedRole === "OWNER"
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-md shadow-zinc-900/15"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300"
              }`}
            >
              <ShieldCheck className={`size-5 mb-1.5 ${selectedRole === "OWNER" ? "text-emerald-400" : "text-emerald-600"}`} />
              <span className="text-xs font-bold">นายทุน (Owner)</span>
              <span className={`text-[10px] mt-0.5 text-center ${selectedRole === "OWNER" ? "text-zinc-300" : "text-zinc-400"}`}>
                น.ส.ฟิลิปดา (ดูยอดรวม/ทุน)
              </span>
            </button>

            {/* Agent Tab */}
            <button
              type="button"
              onClick={() => handleSelectRole("AGENT")}
              className={`flex flex-col items-center justify-center rounded-2xl p-3.5 border transition-all active:scale-95 text-left cursor-pointer ${
                selectedRole === "AGENT"
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-md shadow-zinc-900/15"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300"
              }`}
            >
              <UserCheck className={`size-5 mb-1.5 ${selectedRole === "AGENT" ? "text-blue-400" : "text-blue-600"}`} />
              <span className="text-xs font-bold">สายตรวจ (Agent)</span>
              <span className={`text-[10px] mt-0.5 text-center ${selectedRole === "AGENT" ? "text-zinc-300" : "text-zinc-400"}`}>
                สมชาย (เก็บเงิน/ออกสัญญา)
              </span>
            </button>
          </div>
        </div>

        {/* 1-Tap Quick Login Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => handleQuickLogin(selectedRole)}
            disabled={isLoading}
            className={`w-full flex items-center justify-between rounded-2xl p-3 text-xs font-bold transition-all active:scale-98 cursor-pointer shadow-2xs border ${
              selectedRole === "OWNER"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/80"
                : "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`size-4 shrink-0 ${selectedRole === "OWNER" ? "text-emerald-600" : "text-blue-600"}`} />
              <span>
                {selectedRole === "OWNER"
                  ? "เข้าสู่ระบบด่วน: น.ส.ฟิลิปดา (นายทุน)"
                  : "เข้าสู่ระบบด่วน: สมชาย (สายตรวจ)"}
              </span>
            </div>
            <ArrowRight className="size-4 opacity-60" />
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-zinc-200" />
          <span className="absolute bg-white px-3 text-[11px] font-medium text-zinc-400">
            หรือกรอกรหัสผ่าน / PIN
          </span>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={selectedRole === "OWNER" ? "owner" : "agent1"}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50/70 pl-10 pr-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:bg-white focus:border-zinc-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700">
                รหัสผ่าน หรือ PIN 4 หลัก
              </label>
              <span className="text-[10px] text-zinc-400">
                เริ่มต้น: 1234
              </span>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน (เว้นว่างได้ถ้าใช้ล็อกอินด่วน)"
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50/70 pl-10 pr-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:bg-white focus:border-zinc-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in-50">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 text-xs font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 select-none cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <Lock className="size-3.5" />
                <span>เข้าสู่ระบบ ({selectedRole === "OWNER" ? "นายทุน" : "สายตรวจ"})</span>
              </>
            )}
          </button>
        </form>

        {/* Hints Footer */}
        <div className="mt-5 rounded-xl border border-zinc-150 bg-zinc-50/80 p-3 text-[11px] text-zinc-500 leading-relaxed">
          <div className="font-semibold text-zinc-700 mb-1 flex items-center gap-1">
            <span>ℹ️ ข้อมูลบัญชีเริ่มต้นในระบบ:</span>
          </div>
          <p>
            • <strong>นายทุน:</strong> User: <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-zinc-800">owner</code> (รหัส: <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-zinc-800">1234</code> หรือ <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-zinc-800">8888</code>)
          </p>
          <p className="mt-0.5">
            • <strong>สายตรวจ:</strong> User: <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-zinc-800">agent1</code> (รหัส: <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-zinc-800">1234</code> หรือ <code className="bg-zinc-200/70 px-1 py-0.5 rounded text-zinc-800">1111</code>)
          </p>
        </div>
      </div>
    </div>
  );
}
