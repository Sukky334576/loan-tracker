"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { safeRevalidate } from "@/lib/safe-revalidate";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: "OWNER" | "AGENT";
}

const SESSION_COOKIE_NAME = "loan_tracker_session";

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    return JSON.parse(sessionCookie.value) as SessionUser;
  } catch (error) {
    return null;
  }
}

export async function loginAction(params: {
  username?: string;
  password?: string;
  role?: "OWNER" | "AGENT";
  isQuickLogin?: boolean;
}) {
  try {
    const { username, password, role, isQuickLogin } = params;

    let targetUser = null;

    if (isQuickLogin && role) {
      // Quick 1-click login by role
      targetUser = await prisma.user.findFirst({
        where: { role },
      });
    } else if (username) {
      const cleanUsername = username.trim().toLowerCase();
      // Match by username or role keyword
      if (cleanUsername === "owner" || cleanUsername === "boss" || cleanUsername === "ฟิลิปดา") {
        targetUser = await prisma.user.findFirst({
          where: { role: "OWNER" },
        });
      } else if (cleanUsername === "agent" || cleanUsername === "agent1" || cleanUsername === "สมชาย") {
        targetUser = await prisma.user.findFirst({
          where: { role: "AGENT" },
        });
      } else {
        targetUser = await prisma.user.findUnique({
          where: { username: cleanUsername },
        });
      }

      // Password verification (support standard passwords & convenient PINs)
      if (targetUser && password) {
        const cleanPassword = password.trim();
        const validPasswords = [
          targetUser.passwordHash,
          "1234",
          targetUser.role === "OWNER" ? "8888" : "1111",
          targetUser.role === "OWNER" ? "owner1234" : "agent1234",
        ];

        if (!validPasswords.includes(cleanPassword)) {
          return {
            success: false,
            error: "รหัสผ่านไม่ถูกต้อง (ลองใช้ 1234 หรือ owner1234 / agent1234)",
          };
        }
      }
    }

    if (!targetUser) {
      return {
        success: false,
        error: "ไม่พบบัญชีผู้ใช้งานในระบบ กรุณาตรวจสอบชื่อผู้ใช้หรือเลือกล็อกอินด่วน",
      };
    }

    const sessionData: SessionUser = {
      id: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
      role: targetUser.role as "OWNER" | "AGENT",
    };

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    safeRevalidate("/");
    safeRevalidate("/borrowers");
    safeRevalidate("/ledger");

    return {
      success: true,
      user: sessionData,
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      success: false,
      error: error.message ?? "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    safeRevalidate("/");
    safeRevalidate("/login");

    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
