import { Icon } from "@/frontend/components/ui/Icon";
import type { PublicService } from "@/shared/types/directory";

type ServicePickerProps = {
  services: PublicService[];
  selectedId: string | null;
  onSelect: (service: PublicService) => void;
};

/** 1. lépés: szolgáltatás kiválasztása (nagy, jól nyomható kártyák) */
export function ServicePicker({ services, selectedId, onSelect }: ServicePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((s) => {
        const selected = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(s)}
            className={`space-y-2 rounded-xl border p-5 text-left transition ${
              selected ? "border-brass bg-brass/10" : "border-line bg-surface hover:border-brass"
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-display text-xl font-semibold">{s.name}</span>
              <span className="font-display text-xl font-semibold whitespace-nowrap text-brass">{s.price} lej</span>
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Icon name="clock" size={16} /> {s.durationMin} perc
            </span>
          </button>
        );
      })}
    </div>
  );
}
