import { ROUTES } from "./routes";

// =============================================================================
// A barber indulóoldala: mi nyíljon meg, amikor megnyitja az appot (dontesek.md 36.)
// =============================================================================

export const START_PAGES = [
  { value: "home", label: "Kezdőlap", hint: "A nyitóoldal, mint bárkinek." },
  { value: "calendar", label: "Naptáram", hint: "Rögtön a naptárad." },
  {
    value: "new_booking",
    label: "Új kézi foglalás",
    hint: "A naptárad, rögtön a kézi foglalás űrlapjával (a mostani időponttal) – pl. ha vágás közben hívnak.",
  },
] as const;

export type StartPage = (typeof START_PAGES)[number]["value"];

export function isStartPage(value: string): value is StartPage {
  return START_PAGES.some((p) => p.value === value);
}

/** A naptár, rögtön a kézi foglalás űrlapjával */
export const NEW_BOOKING_PATH = `${ROUTES.barberCalendar}?uj=foglalas`;

/** Hová vigyük az app megnyitásakor (null: maradjon a kezdőlap) */
export function startPagePath(page: StartPage): string | null {
  if (page === "calendar") return ROUTES.barberCalendar;
  if (page === "new_booking") return NEW_BOOKING_PATH;
  return null;
}
