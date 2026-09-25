type PageHeaderProps = {
  /** Kis felirat a cím fölött */
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

/** Oldalcím: felső kis felirat, nagy cím, alcím. */
export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <header className="space-y-2">
      {eyebrow && <p className="text-sm uppercase tracking-[0.2em] text-brass">{eyebrow}</p>}
      <h1 className="font-serif text-4xl font-bold">{title}</h1>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </header>
  );
}
