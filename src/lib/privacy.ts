"use client";

import { useState, useEffect, useCallback } from "react";

export const PRIVACY_EVENT = "lt_privacy_change";
export const PRIVACY_STORAGE_KEY = "lt_privacy_mode";

/**
 * Hook to manage privacy mode across components.
 * Persists in localStorage and synchronizes across components using CustomEvent.
 */
export function usePrivacyMode() {
  const [isPrivacy, setIsPrivacy] = useState(false);

  useEffect(() => {
    // Check initial state from localStorage
    try {
      const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (saved === "true") {
        setIsPrivacy(true);
      }
    } catch {
      // ignore
    }

    const handleSync = () => {
      try {
        const current = localStorage.getItem(PRIVACY_STORAGE_KEY);
        setIsPrivacy(current === "true");
      } catch {
        // ignore
      }
    };

    window.addEventListener(PRIVACY_EVENT, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener(PRIVACY_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const togglePrivacy = useCallback(() => {
    setIsPrivacy((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, nextVal ? "true" : "false");
        window.dispatchEvent(new Event(PRIVACY_EVENT));
      } catch {
        // ignore
      }
      return nextVal;
    });
  }, []);

  return { isPrivacy, togglePrivacy };
}

/**
 * Format amount with privacy masking.
 */
export function formatPrivateAmount(
  amount: number | string | null | undefined,
  isPrivacy: boolean,
  suffix = " ฿"
): string {
  if (isPrivacy) {
    return "฿ •••,•••";
  }
  if (amount === null || amount === undefined) {
    return `0${suffix}`;
  }
  if (typeof amount === "number") {
    return `${amount.toLocaleString()}${suffix}`;
  }
  return `${amount}${suffix}`;
}
