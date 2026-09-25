import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

/** Lekerekített, keretes doboz – tartalmi blokkokhoz. */
export function Card({ title, children }: CardProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      {title && <h2 className="font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
