import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { hu } from "date-fns/locale";

/** Az app egyetlen időzónája. Minden időpontot UTC-ben tárolunk, és itt jelenítünk meg. */
export const TIMEZONE = "Europe/Bucharest";

/** Pl. „2026. október 3., szombat 14:00” */
export function formatDateTimeHu(date: Date | string): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy. MMMM d., EEEE HH:mm", { locale: hu });
}

/** Pl. „2026. október 3., szombat” */
export function formatDateHu(date: Date | string): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy. MMMM d., EEEE", { locale: hu });
}

/** Bukaresti helyi idő („2026-10-03T14:00”) → UTC Date. */
export function bucharestToUtc(localDateTime: string): Date {
  return fromZonedTime(localDateTime, TIMEZONE);
}
