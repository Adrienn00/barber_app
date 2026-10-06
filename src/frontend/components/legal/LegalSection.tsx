import type { ReactNode } from "react";

/** Egy fejezet a jogi oldalakon: számozott cím és szöveg. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-muted [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
