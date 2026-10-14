import Image from "next/image";
import { formatDateTimeHu } from "@/shared/datetime/datetime";
import type { CutEntry } from "@/shared/types/cutlog";

type CutEntryViewProps = {
  entry: CutEntry;
  /** Látszódjon-e a dátum és a szolgáltatás (a foglalás kártyáján már ott van) */
  showDate?: boolean;
  /** Kisebb fotó (pl. a korábbi vágások listájában) */
  compact?: boolean;
};

/** Egy vágásnapló-bejegyzés: fotó (koppintásra teljes méretben) és a barber jegyzete. */
export function CutEntryView({ entry, showDate = true, compact = false }: CutEntryViewProps) {
  return (
    <div className={`flex gap-3 ${compact ? "items-start" : "flex-col"}`}>
      {entry.photoUrl && (
        <a href={entry.photoUrl} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Fotó teljes méretben">
          <Image
            src={entry.photoUrl}
            alt={`Vágás – ${formatDateTimeHu(entry.startsAt)}`}
            width={compact ? 96 : 640}
            height={compact ? 96 : 640}
            // A kép már kicsinyített webp a tárhelyen – nem kell újra optimalizálni
            unoptimized
            className={`rounded-lg border border-line object-cover ${compact ? "size-24" : "max-h-80 w-full sm:w-auto"}`}
          />
        </a>
      )}
      <div className="min-w-0 space-y-1 text-sm">
        {showDate && (
          <p className="text-muted">
            {formatDateTimeHu(entry.startsAt)} · {entry.serviceName}
          </p>
        )}
        {entry.note && <p className="whitespace-pre-line">{entry.note}</p>}
      </div>
    </div>
  );
}
