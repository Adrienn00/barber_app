import { WEEK_DAYS } from "@/shared/validation/schedule";
import { addDaysToDate, toBucharestDate } from "./datetime";

export type UpcomingDay = {
  date: string;
  weekdayShort: string;
  /** Teljes felirat (képernyőolvasónak, teszteknek), pl. „10. 13.” */
  label: string;
  /** Nagy szám a gombon, pl. „13” */
  dayNumber: string;
  /** Rövid hónap a gombon, pl. „okt.” */
  monthShort: string;
  open: boolean;
};

const MONTHS = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

/** 0 = vasárnap … 6 = szombat (adatbázis-konvenció) egy „2026-10-13” dátumhoz */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * A következő `count` nap (mától, bukaresti helyi dátummal) a foglaláshoz.
 * open = a barber dolgozik-e aznap (az openWeekdays alapján).
 */
export function upcomingDays(count: number, openWeekdays: number[], now: Date = new Date()): UpcomingDay[] {
  const today = toBucharestDate(now);
  return Array.from({ length: count }, (_, i) => {
    const date = addDaysToDate(today, i);
    const weekday = weekdayOf(date);
    const [, month, day] = date.split("-");
    return {
      date,
      weekdayShort: i === 0 ? "Ma" : (WEEK_DAYS.find((d) => d.weekday === weekday)?.short ?? ""),
      label: `${Number(month)}. ${Number(day)}.`,
      dayNumber: String(Number(day)),
      monthShort: MONTHS[Number(month) - 1],
      open: openWeekdays.includes(weekday),
    };
  });
}
