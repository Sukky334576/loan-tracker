/**
 * Haptic feedback utility for mobile PWA field operations.
 * Uses the Web Vibration API (navigator.vibrate) with safe fallbacks.
 */

export type HapticType =
  | "light"      // 10ms - subtle button tap
  | "selection"  // 15ms - tab switch, filter toggle, date pill
  | "medium"     // 25ms - open drawer / modal
  | "heavy"      // 45ms - delete, submit action
  | "success"    // [30, 50, 40] - payment received, contract signed
  | "warning"    // [40, 60, 40] - overdue alert, validation alert
  | "error";     // [50, 100, 50, 100] - action failed

export function triggerHaptic(type: HapticType = "light"): void {
  if (typeof window === "undefined") return;

  try {
    if ("navigator" in window && typeof navigator.vibrate === "function") {
      switch (type) {
        case "light":
          navigator.vibrate(10);
          break;
        case "selection":
          navigator.vibrate(15);
          break;
        case "medium":
          navigator.vibrate(25);
          break;
        case "heavy":
          navigator.vibrate(45);
          break;
        case "success":
          navigator.vibrate([30, 50, 40]);
          break;
        case "warning":
          navigator.vibrate([40, 60, 40]);
          break;
        case "error":
          navigator.vibrate([50, 100, 50, 100]);
          break;
        default:
          navigator.vibrate(15);
      }
    }
  } catch (err) {
    // Gracefully ignore if browser policies restrict vibration
  }
}
