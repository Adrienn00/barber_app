type StepIndicatorProps = {
  steps: string[];
  /** 0-tól számolva */
  current: number;
};

/** Lépésjelző (pl. foglalás: 1 Szolgáltatás — 2 Időpont — 3 Megerősítés; beállító varázsló) */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-colors duration-500 ${
              i === current
                ? "border-brass text-brass"
                : i < current
                  ? "border-brass bg-brass text-background"
                  : "border-line text-muted"
            }`}
          >
            {i < current ? "✓" : i + 1}
          </span>
          <span className={`hidden text-sm font-semibold sm:inline ${i === current ? "text-foreground" : "text-muted"}`}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className={`absolute inset-y-0 left-0 bg-brass transition-[width] duration-700 ease-out ${i < current ? "w-full" : "w-0"}`}
              />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
