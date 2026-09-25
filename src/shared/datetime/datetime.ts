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

/** UTC időpont → bukaresti helyi idő szövegként, időzóna nélkül: „2026-10-03T14:00:00” (a naptár ezt jeleníti meg) */
export function toBucharestLocal(date: Date | string): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
}

/** UTC időpont → bukaresti helyi dátum: „2026-10-03” */
export function toBucharestDate(date: Date | string): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

/** UTC időpont → bukaresti helyi óra:perc: „14:00” */
export function toBucharestTime(date: Date | string): string {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
}

/** Naptári nap hozzáadása egy „2026-10-03” alakú dátumhoz (időzónától független) */
export function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
