const THAI_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/**
 * จัดรูปแบบวันที่ภาษาไทยแบบแน่นอน 100% (Deterministic)
 * ป้องกันปัญหา Hydration Mismatch ระหว่าง Node.js Server กับ Client Browser
 */
export function formatThaiDate(
  date: Date | string,
  options?: { showDayOfWeek?: boolean; showTime?: boolean }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return "-";

  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  const dayOfWeek = THAI_DAYS[d.getDay()];

  let result = options?.showDayOfWeek
    ? `${dayOfWeek} ${day} ${month} ${year}`
    : `${day} ${month} ${year}`;

  if (options?.showTime) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    result += ` ${hours}:${minutes} น.`;
  }

  return result;
}
