/**
 * Utility to convert numeric amounts into Thai Baht text format
 * e.g. 1000 -> "หนึ่งพันบาทถ้วน"
 *      800  -> "แปดร้อยบาทถ้วน"
 *      1250 -> "หนึ่งพันสองร้อยห้าสิบบาทถ้วน"
 *      21   -> "ยี่สิบเอ็ดบาทถ้วน"
 */

const THAI_NUMBERS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_UNITS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

function convertGroup(numStr: string): string {
  let result = "";
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[i], 10);
    const unitIndex = len - 1 - i;

    if (digit !== 0) {
      if (unitIndex === 0 && digit === 1 && len > 1) {
        // Last digit 1 becomes "เอ็ด" if not alone
        result += "เอ็ด";
      } else if (unitIndex === 1 && digit === 1) {
        // Tens position 1 is just "สิบ" (not "หนึ่งสิบ")
        result += "สิบ";
      } else if (unitIndex === 1 && digit === 2) {
        // Tens position 2 is "ยี่สิบ"
        result += "ยี่สิบ";
      } else {
        result += THAI_NUMBERS[digit] + (unitIndex > 0 ? THAI_UNITS[unitIndex] : "");
      }
    }
  }

  return result;
}

export function bahtText(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "";
  if (amount === 0) return "ศูนย์บาทถ้วน";

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const [integerPart, decimalPart] = absAmount.toFixed(2).split(".");

  let result = "";

  // Handle numbers larger than a million by chunking
  let intStr = integerPart;
  const chunks: string[] = [];
  while (intStr.length > 6) {
    chunks.unshift(intStr.slice(-6));
    intStr = intStr.slice(0, -6);
  }
  chunks.unshift(intStr);

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = convertGroup(chunks[i]);
    if (chunkText) {
      result += chunkText;
      if (i < chunks.length - 1) {
        result += "ล้าน";
      }
    }
  }

  result += "บาท";

  const satang = parseInt(decimalPart, 10);
  if (satang === 0) {
    result += "ถ้วน";
  } else {
    result += convertGroup(decimalPart) + "สตางค์";
  }

  return (isNegative ? "ลบ" : "") + result;
}
