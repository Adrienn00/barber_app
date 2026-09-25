import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-line text-foreground",
  success: "bg-ok/15 text-ok",
  warning: "bg-pending/15 text-pending",
  danger: "bg-danger/15 text-danger",
};

/** Kis címke állapotjelzésre (pl. „Függőben”, „Jóváhagyva”). */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
