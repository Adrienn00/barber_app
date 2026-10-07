import type { Slot } from "@/shared/types/directory";

type SlotGridProps = {
  slots: Slot[];
  selected: string | null;
  loading: boolean;
  onSelect: (slot: Slot) => void;
};

/** A választott nap szabad kezdési időpontjai rácsban. */
export function SlotGrid({ slots, selected, loading, onSelect }: SlotGridProps) {
  if (loading) return <p className="text-muted">Szabad időpontok betöltése…</p>;
  if (slots.length === 0) {
    return <p className="rounded-lg bg-background px-4 py-3 text-muted">Erre a napra nincs szabad időpont. Válassz másik napot.</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {slots.map((s) => {
        const isSelected = s.startsAt === selected;
        return (
          <button
            key={s.startsAt}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(s)}
            className={`min-h-12 rounded-lg border font-semibold transition duration-200 hover:-translate-y-0.5 ${
              isSelected
                ? "ct-pop border-brass bg-brass text-background shadow-[0_8px_20px_-10px_rgb(212_169_94/0.8)]"
                : "border-line bg-surface hover:border-brass"
            }`}
          >
            {s.time}
          </button>
        );
      })}
    </div>
  );
}
