import type { ReactNode } from "react";

/**
 * Kis, nagybetűs, ritkított arany felirat a címek fölött.
 * pill: körvonalas „kapszula” változat (pl. „PRÉMIUM FÉRFIFODRÁSZAT”).
 */
export function Eyebrow({ children, pill = false }: { children: ReactNode; pill?: boolean }) {
  return (
    <p
      className={`text-sm font-semibold uppercase tracking-[0.25em] text-brass ${
        pill ? "inline-flex rounded-full border border-brass/50 bg-brass/5 px-5 py-2" : ""
      }`}
    >
      {children}
    </p>
  );
}
