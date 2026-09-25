import { Eyebrow } from "@/frontend/components/ui/Eyebrow";

type PageHeaderProps = {
  /** Kis arany felirat a cím fölött */
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

/** Oldalcím: kis arany felirat, nagy keskeny cím, alcím. */
export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <header className="space-y-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
      {subtitle && <p className="text-lg text-muted">{subtitle}</p>}
    </header>
  );
}
