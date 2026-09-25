import type { BookingStatus } from "./domain";

// =============================================================================
// A barber naptárának adatai – ezt kapja a naptár felület a backendtől.
// Minden időpont kétféleképpen: UTC (startsAt) és bukaresti helyi idő (startLocal, időzóna nélkül).
// =============================================================================

export type CalendarBooking = {
  kind: "booking";
  id: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  startLocal: string;
  endLocal: string;
  serviceName: string;
  price: number;
  /** Vendég neve és telefonja (fiókos vendégnél a profilból, kézi foglalásnál a megadott) */
  customerName: string;
  customerPhone: string | null;
  /** Kézi foglalás fiók nélküli vendégnek */
  isGuest: boolean;
  note: string | null;
};

export type CalendarPrivateEvent = {
  kind: "private";
  eventId: string;
  /** Az alkalom helyi dátuma – ezzel lehet egy heti alkalmat kihagyni */
  occurrenceDate: string;
  startsAt: string;
  endsAt: string;
  startLocal: string;
  endLocal: string;
  title: string;
  note: string | null;
  allDay: boolean;
  repeat: "none" | "weekly";
  repeatUntil: string | null;
};

/** Egy munkaidő-sáv, pl. hétfő 09:00–13:00 (0 = vasárnap) */
export type WorkingHoursSlot = { weekday: number; start: string; end: string };

export type CalendarData = {
  bookings: CalendarBooking[];
  privateEvents: CalendarPrivateEvent[];
  workingHours: WorkingHoursSlot[];
};

/** Kézi foglaláshoz: a barber szolgáltatásai és korábbi vendégei */
export type ServiceOption = { id: string; name: string; durationMin: number; price: number };
export type CustomerOption = { id: string; name: string; phone: string | null };
