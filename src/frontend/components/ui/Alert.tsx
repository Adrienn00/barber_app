import type { ReactNode } from "react";

type AlertTone = "error" | "success" | "info";

const TONES: Record<AlertTone, string> = {
  error: "border-danger/50 bg-danger/10 text-danger",
  success: "border-ok/50 bg-ok/10 text-ok",
  info: "border-line bg-surface text-muted",
};

/** Kiemelt üzenetdoboz: hiba (piros), siker (zöld) vagy tájékoztatás (szürke). */
export function Alert({ tone = "info", children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${TONES[tone]}`}>
      {children}
    </div>
  );
}
