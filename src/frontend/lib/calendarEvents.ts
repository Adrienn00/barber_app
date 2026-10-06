import type { EventInput } from "@fullcalendar/core";
import type {
  CalendarBooking,
  CalendarData,
  CalendarPrivateEvent,
  CalendarProposal,
  WorkingHoursSlot,
} from "@/shared/types/calendar";

// =============================================================================
// A backendtől kapott naptáradatok átalakítása a FullCalendar formájára.
// Az időpontok „lebegő” helyi idők (startLocal) – a naptár timeZone: "UTC" beállítással fut,
// így mindig bukaresti időt mutat, bárhol is van a néző.
// =============================================================================

export type CalendarItem = CalendarBooking | CalendarProposal | CalendarPrivateEvent;

/** Egyedi azonosító a naptárban (egy heti program minden alkalma külön esemény) */
export function itemKey(item: CalendarItem): string {
  if (item.kind === "private") return `private:${item.eventId}:${item.occurrenceDate}`;
  return `${item.kind}:${item.id}`;
}

/** Színkódolás (spec 5.1): függő sárga szaggatott, megerősített zöld, magánprogram szürke csíkos */
function classNamesFor(item: CalendarItem): string[] {
  if (item.kind === "private") return ["ct-event", "ct-event-private"];
  if (item.kind === "proposal") return ["ct-event", "ct-event-proposal"];
  return ["ct-event", item.status === "pending" ? "ct-event-pending" : "ct-event-confirmed"];
}

function titleFor(item: CalendarItem): string {
  if (item.kind === "private") return item.title;
  if (item.kind === "proposal") return `Javaslat: ${item.customerName} · ${item.serviceName}`;
  return `${item.customerName} · ${item.serviceName}`;
}

export function toEventInputs(data: CalendarData): EventInput[] {
  const items: CalendarItem[] = [...data.bookings, ...data.proposals, ...data.privateEvents];
  return items.map((item) => ({
    id: itemKey(item),
    title: titleFor(item),
    start: item.startLocal,
    end: item.endLocal,
    allDay: item.kind === "private" && item.allDay,
    classNames: classNamesFor(item),
    // Az egyszeri magánprogram húzható és nyújtható; a megerősített foglalás csak húzható
    // (az áthelyezés ablakát nyitja meg); a függő kérés, a javaslat és a heti sorozat nem mozdítható
    editable: (item.kind === "private" && item.repeat === "none") || (item.kind === "booking" && item.status === "confirmed"),
    durationEditable: item.kind === "private",
    extendedProps: { item },
  }));
}

/** Munkaidő a FullCalendar formájában (a munkaidőn kívüli sáv halványítva jelenik meg) */
export function toBusinessHours(hours: WorkingHoursSlot[]) {
  return hours.map((h) => ({ daysOfWeek: [h.weekday], startTime: h.start, endTime: h.end }));
}
