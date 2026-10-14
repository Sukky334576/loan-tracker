import React, { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "เข้าสู่ระบบ | LoanTracker",
  description: "เข้าสู่ระบบสำหรับนายทุนและสายตรวจ",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 text-zinc-400">
            <Loader2 className="size-6 animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
