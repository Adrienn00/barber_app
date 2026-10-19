// =============================================================================
// Napon belüli idő („HH:MM”) számolása – pl. a foglalás befejezésének beírásához
// =============================================================================

/** „HH:MM” → percek a nap kezdetétől; null, ha nem ilyen alakú */
export function toMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Percek a nap kezdetétől → „HH:MM”; null, ha kilógna a napból */
export function fromMinutes(minutes: number): string | null {
  if (minutes < 0 || minutes >= 24 * 60) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Pl. 75 → „1 óra 15 perc” */
export function lengthLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} óra${m ? ` ${m} perc` : ""}` : `${m} perc`;
}
