import { addDaysToDate, bucharestToUtc } from "@/shared/datetime/datetime";
import type { Validated } from "./forms";
import { normalizePhone } from "./phone";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function result<T>(errors: Record<string, string>, data: T): Validated<T> {
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, data };
}

// -----------------------------------------------------------------------------
// Magánprogram (cím, nap, idő vagy egész nap, heti ismétlődés)
// A beírt helyi (bukaresti) időt alakítja UTC-re – óraátállításkor is helyesen.
// -----------------------------------------------------------------------------
export type PrivateEventInput = {
  title: string;
  date: string; // „2026-10-03”
  startTime: string; // „12:00” (egész napnál üres)
  endTime: string;
  allDay: boolean;
  /** Egész napos esemény utolsó napja (több napos szabadsághoz); üres = csak egy nap */
  endDate: string;
  repeatWeekly: boolean;
  /** Heti ismétlődés utolsó napja; üres = nincs vége */
  repeatUntil: string;
  note: string;
};

export type PrivateEventData = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  repeat: "none" | "weekly";
  repeatUntil: string | null;
  note: string | null;
};

export function validatePrivateEvent(input: PrivateEventInput): Validated<PrivateEventData> {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  if (!title) errors.title = "Adj meg egy címet (pl. Orvos, Szabadnap).";
  else if (title.length > 100) errors.title = "Legfeljebb 100 karakter lehet.";
  if (input.note.length > 1000) errors.note = "A megjegyzés legfeljebb 1000 karakter lehet.";
  if (!DATE_RE.test(input.date)) errors.date = "Válaszd ki a napot.";

  let startsAt = "";
  let endsAt = "";

  if (input.allDay) {
    const lastDay = input.endDate || input.date;
    if (input.endDate && (!DATE_RE.test(input.endDate) || input.endDate < input.date)) {
      errors.endDate = "Az utolsó nap nem lehet korábban, mint az első.";
    } else if (DATE_RE.test(input.date)) {
      startsAt = bucharestToUtc(`${input.date}T00:00`).toISOString();
      endsAt = bucharestToUtc(`${addDaysToDate(lastDay, 1)}T00:00`).toISOString();
    }
  } else {
    if (!TIME_RE.test(input.startTime)) errors.startTime = "Add meg a kezdést.";
    if (!TIME_RE.test(input.endTime)) errors.endTime = "Add meg a befejezést.";
    else if (TIME_RE.test(input.startTime) && input.endTime <= input.startTime) {
      errors.endTime = "A befejezés legyen később, mint a kezdés.";
    }
    if (!errors.date && !errors.startTime && !errors.endTime) {
      startsAt = bucharestToUtc(`${input.date}T${input.startTime}`).toISOString();
      endsAt = bucharestToUtc(`${input.date}T${input.endTime}`).toISOString();
    }
  }

  let repeatUntil: string | null = null;
  if (input.repeatWeekly && input.repeatUntil) {
    if (!DATE_RE.test(input.repeatUntil) || input.repeatUntil < input.date) {
      errors.repeatUntil = "Az ismétlődés vége nem lehet korábban, mint az első alkalom.";
    } else {
      repeatUntil = input.repeatUntil;
    }
  }
  if (input.repeatWeekly && startsAt && endsAt) {
    const days = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86_400_000;
    if (days > 7) errors.endDate = "Hetente ismétlődő esemény legfeljebb 7 napos lehet.";
  }

  return result(errors, {
    title,
    startsAt,
    endsAt,
    allDay: input.allDay,
    repeat: input.repeatWeekly ? "weekly" : "none",
    repeatUntil,
    note: input.note.trim() || null,
  });
}

// -----------------------------------------------------------------------------
// Kézi foglalás (barber veszi fel, pl. telefonos vendégnek)
// -----------------------------------------------------------------------------
export type ManualBookingInput = {
  serviceId: string;
  date: string;
  time: string;
  /** Korábbi vendég azonosítója; üres = új vendég név + telefon alapján */
  customerId: string;
  guestName: string;
  guestPhone: string;
  note: string;
};

export type ManualBookingData = {
  serviceId: string;
  startsAt: string;
  customerId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  note: string | null;
};

export function validateManualBooking(input: ManualBookingInput): Validated<ManualBookingData> {
  const errors: Record<string, string> = {};
  if (!input.serviceId) errors.serviceId = "Válaszd ki a szolgáltatást.";
  if (!DATE_RE.test(input.date)) errors.date = "Válaszd ki a napot.";
  if (!TIME_RE.test(input.time)) errors.time = "Add meg a kezdés idejét.";

  let guestPhone: string | null = null;
  if (!input.customerId) {
    if (input.guestName.trim().length < 2) errors.guestName = "Add meg a vendég nevét.";
    guestPhone = normalizePhone(input.guestPhone);
    if (!guestPhone) errors.guestPhone = "Adj meg egy érvényes telefonszámot.";
  }
  if (input.note.length > 500) errors.note = "A megjegyzés legfeljebb 500 karakter lehet.";

  return result(errors, {
    serviceId: input.serviceId,
    startsAt: errors.date || errors.time ? "" : bucharestToUtc(`${input.date}T${input.time}`).toISOString(),
    customerId: input.customerId || null,
    guestName: input.customerId ? null : input.guestName.trim(),
    guestPhone: input.customerId ? null : guestPhone,
    note: input.note.trim() || null,
  });
}
