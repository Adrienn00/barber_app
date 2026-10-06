import type { UpcomingDay } from "@/shared/datetime/days";

/** Egy választható nap: „2026-10-13”, rövid napnév, nap és hónap, nyitva van-e a barber */
export type BookingDay = UpcomingDay;

type DayPickerProps = {
  days: BookingDay[];
  selected: string | null;
  onSelect: (date: string) => void;
};

/** A következő napok vízszintesen görgethető sorban (telefonon ujjal húzható). */
export function DayPicker({ days, selected, onSelect }: DayPickerProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
      {days.map((d) => {
        const isSelected = d.date === selected;
        return (
          <button
            key={d.date}
            type="button"
            disabled={!d.open}
            aria-pressed={isSelected}
            aria-label={`${d.weekdayShort} ${d.label}${d.open ? "" : " – zárva"}`}
            onClick={() => onSelect(d.date)}
            className={`flex min-w-16 shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition disabled:opacity-35 ${
              isSelected ? "border-brass bg-brass text-background" : "border-line bg-surface hover:border-brass"
            }`}
          >
            <span className="text-xs font-semibold uppercase">{d.weekdayShort}</span>
            <span className="font-display text-2xl leading-tight font-semibold">{d.dayNumber}</span>
            <span className="text-xs">{d.monthShort}</span>
          </button>
        );
      })}
    </div>
  );
}
