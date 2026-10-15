import type { Metadata, Viewport } from "next";
import { Prompt, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/app/actions/auth";
import "./globals.css";

const promptFont = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "LoanTracker | ระบบติดตามเงินกู้ระยะสั้น",
  description: "ระบบบริหารและติดตามเงินกู้ระยะสั้น Mobile-First PWA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LoanTracker",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="th"
      className={`${promptFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-zinc-900 font-sans flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
        <AppShell initialSession={session}>{children}</AppShell>
      </body>
    </html>
  );
}
