import type { ReactNode } from "react";

type EntryCardProps = {
  title: string;
  description: string;
  /** A kártya alján lévő gomb(ok) */
  action: ReactNode;
};

/** Belépési pont a kezdőlapon („Barbert keresel?” / „Barber vagy?”). */
export function EntryCard({ title, description, action }: EntryCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold">{title}</h2>
        <p className="text-muted">{description}</p>
      </div>
      <div className="mt-auto">{action}</div>
    </section>
  );
}
