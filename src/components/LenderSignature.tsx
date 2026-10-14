import React from "react";

export function LenderSignature({ className = "h-14 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ลายมือชื่อ นางสาวฟิลิปดา ภาปัญญา"
    >
      {/* Authentic flowing handwritten pen strokes */}
      <path
        d="M 45 68 C 42 45, 48 18, 52 14 C 55 10, 68 12, 72 24 C 76 36, 60 52, 40 50 C 30 49, 32 40, 48 38 C 65 36, 85 45, 95 44 C 105 43, 112 36, 120 42 C 128 48, 132 42, 142 41 C 150 40, 155 45, 165 43 C 175 41, 185 35, 192 38"
        stroke="#1a202c"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Characteristic underline flourish */}
      <path
        d="M 32 58 C 65 57, 120 59, 185 54 C 205 52, 215 50, 210 55 C 200 62, 160 63, 140 64"
        stroke="#1a202c"
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
