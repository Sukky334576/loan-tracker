import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-zinc-900 font-sans flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
