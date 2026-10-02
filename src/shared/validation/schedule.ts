import type { Validated } from "./forms";

// =============================================================================
// Munkaidő és foglalási szabályok – ellenőrzés és a választható értékek
// =============================================================================

/** A hét napjai hétfőtől (megjelenítés); weekday: 0 = vasárnap (adatbázis-konvenció) */
export const WEEK_DAYS: { weekday: number; label: string; short: string }[] = [
  { weekday: 1, label: "Hétfő", short: "H" },
  { weekday: 2, label: "Kedd", short: "K" },
  { weekday: 3, label: "Szerda", short: "Sze" },
  { weekday: 4, label: "Csütörtök", short: "Cs" },
  { weekday: 5, label: "Péntek", short: "P" },
  { weekday: 6, label: "Szombat", short: "Szo" },
  { weekday: 0, label: "Vasárnap", short: "V" },
];

export type TimeRange = { start: string; end: string };
export type DayHours = { weekday: number; open: boolean; ranges: TimeRange[] };
export type WorkingHoursSlot = { weekday: number; start: string; end: string };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Heti munkaidő ellenőrzése: nyitott napon legalább egy sáv, minden sáv vége később van,
 * mint az eleje, és egy napon belül a sávok (pl. délelőtt / délután) nem fedik egymást.
 * Hiba a nap szerint: fieldErrors["day-1"] = „…”.
 */
export function validateWorkingHours(days: DayHours[]): Validated<WorkingHoursSlot[]> {
  const errors: Record<string, string> = {};
  const slots: WorkingHoursSlot[] = [];

  for (const day of days) {
    if (!day.open) continue;
    const key = `day-${day.weekday}`;
    if (day.ranges.length === 0) {
      errors[key] = "Adj meg legalább egy sávot, vagy jelöld zárva.";
      continue;
    }
    if (day.ranges.some((r) => !TIME_RE.test(r.start) || !TIME_RE.test(r.end))) {
      errors[key] = "Adj meg minden kezdést és befejezést (óra:perc).";
      continue;
    }
    if (day.ranges.some((r) => r.end <= r.start)) {
      errors[key] = "A sáv vége legyen később, mint az eleje.";
      continue;
    }
    const sorted = [...day.ranges].sort((a, b) => a.start.localeCompare(b.start));
    if (sorted.some((r, i) => i > 0 && r.start < sorted[i - 1].end)) {
      errors[key] = "A sávok nem fedhetik egymást (pl. 9:00–13:00 és 14:00–18:00).";
      continue;
    }
    slots.push(...sorted.map((r) => ({ weekday: day.weekday, start: r.start, end: r.end })));
  }

  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, data: slots };
}

// -----------------------------------------------------------------------------
// Foglalási szabályok – csak ezek az értékek választhatók (az adatbázis határain belül)
// -----------------------------------------------------------------------------
export const RULE_OPTIONS = {
  minNoticeMin: [
    { value: 0, label: "Bármikor (akár azonnal)" },
    { value: 30, label: "30 perccel előtte" },
    { value: 60, label: "1 órával előtte" },
    { value: 120, label: "2 órával előtte" },
    { value: 240, label: "4 órával előtte" },
    { value: 720, label: "12 órával előtte" },
    { value: 1440, label: "1 nappal előtte" },
  ],
  maxDaysAhead: [
    { value: 7, label: "1 hétre előre" },
    { value: 14, label: "2 hétre előre" },
    { value: 30, label: "1 hónapra előre" },
    { value: 60, label: "2 hónapra előre" },
    { value: 90, label: "3 hónapra előre" },
  ],
  approvalTimeoutMin: [
    { value: 30, label: "30 percen belül" },
    { value: 60, label: "1 órán belül" },
    { value: 120, label: "2 órán belül" },
    { value: 240, label: "4 órán belül" },
    { value: 720, label: "12 órán belül" },
    { value: 1440, label: "24 órán belül" },
  ],
  cancelLimitHours: [
    { value: 0, label: "Bármikor lemondhatja" },
    { value: 2, label: "2 órával előtte" },
    { value: 6, label: "6 órával előtte" },
    { value: 12, label: "12 órával előtte" },
    { value: 24, label: "24 órával előtte" },
    { value: 48, label: "48 órával előtte" },
  ],
  bufferMin: [
    { value: 0, label: "Nincs szünet" },
    { value: 5, label: "5 perc" },
    { value: 10, label: "10 perc" },
    { value: 15, label: "15 perc" },
  ],
  slotStepMin: [
    { value: 10, label: "10 percenként" },
    { value: 15, label: "15 percenként" },
    { value: 20, label: "20 percenként" },
    { value: 30, label: "30 percenként" },
  ],
} as const;

export type BookingRules = {
  minNoticeMin: number;
  maxDaysAhead: number;
  approvalTimeoutMin: number;
  cancelLimitHours: number;
  bufferMin: number;
  slotStepMin: number;
};

/** Foglalási szabályok ellenőrzése: csak a felkínált értékek fogadhatók el */
export function validateBookingRules(input: Record<keyof BookingRules, string>): Validated<BookingRules> {
  const errors: Record<string, string> = {};
  const data = {} as BookingRules;
  for (const key of Object.keys(RULE_OPTIONS) as (keyof BookingRules)[]) {
    const value = Number(input[key]);
    if (!RULE_OPTIONS[key].some((o) => o.value === value)) errors[key] = "Válassz a listából.";
    else data[key] = value;
  }
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, data };
}
