import type { EventInput } from "@fullcalendar/core";
import type { CalendarBooking, CalendarData, CalendarPrivateEvent, WorkingHoursSlot } from "@/shared/types/calendar";

// =============================================================================
// A backendtől kapott naptáradatok átalakítása a FullCalendar formájára.
// Az időpontok „lebegő” helyi idők (startLocal) – a naptár timeZone: "UTC" beállítással fut,
// így mindig bukaresti időt mutat, bárhol is van a néző.
// =============================================================================

export type CalendarItem = CalendarBooking | CalendarPrivateEvent;

/** Egyedi azonosító a naptárban (egy heti program minden alkalma külön esemény) */
export function itemKey(item: CalendarItem): string {
  return item.kind === "booking" ? `booking:${item.id}` : `private:${item.eventId}:${item.occurrenceDate}`;
}

/** Színkódolás (spec 5.1): függő sárga szaggatott, megerősített zöld, magánprogram szürke csíkos */
function classNamesFor(item: CalendarItem): string[] {
  if (item.kind === "private") return ["ct-event", "ct-event-private"];
  return ["ct-event", item.status === "pending" ? "ct-event-pending" : "ct-event-confirmed"];
}

function titleFor(item: CalendarItem): string {
  if (item.kind === "private") return item.title;
  return `${item.customerName} · ${item.serviceName}`;
}

export function toEventInputs(data: CalendarData): EventInput[] {
  const items: CalendarItem[] = [...data.bookings, ...data.privateEvents];
  return items.map((item) => ({
    id: itemKey(item),
    title: titleFor(item),
    start: item.startLocal,
    end: item.endLocal,
    allDay: item.kind === "private" && item.allDay,
    classNames: classNamesFor(item),
    // Csak az egyszeri magánprogram húzható / nyújtható; a foglalás és a heti sorozat nem
    editable: item.kind === "private" && item.repeat === "none",
    extendedProps: { item },
  }));
}

/** Munkaidő a FullCalendar formájában (a munkaidőn kívüli sáv halványítva jelenik meg) */
export function toBusinessHours(hours: WorkingHoursSlot[]) {
  return hours.map((h) => ({ daysOfWeek: [h.weekday], startTime: h.start, endTime: h.end }));
}
