import { describe, expect, it } from "vitest";
import type { CalendarData } from "@/shared/types/calendar";
import { toBusinessHours, toEventInputs } from "./calendarEvents";

const data: CalendarData = {
  bookings: [
    {
      kind: "booking",
      id: "b1",
      status: "pending",
      startsAt: "2026-10-05T07:00:00Z",
      endsAt: "2026-10-05T07:30:00Z",
      startLocal: "2026-10-05T10:00:00",
      endLocal: "2026-10-05T10:30:00",
      serviceName: "Hajvágás",
      price: 60,
      customerName: "Tóth Anna",
      customerPhone: "+40745123456",
      isGuest: false,
      note: null,
      movedFrom: null,
      proposal: null,
    },
    {
      kind: "booking",
      id: "b2",
      status: "confirmed",
      startsAt: "2026-10-05T08:00:00Z",
      endsAt: "2026-10-05T08:30:00Z",
      startLocal: "2026-10-05T11:00:00",
      endLocal: "2026-10-05T11:30:00",
      serviceName: "Szakáll",
      price: 40,
      customerName: "Fekete Béla",
      customerPhone: null,
      isGuest: false,
      note: null,
      movedFrom: null,
      proposal: { id: "r1", startsAt: "2026-10-06T08:00:00Z", expiresAt: "2026-10-05T07:00:00Z" },
    },
  ],
  proposals: [
    {
      kind: "proposal",
      id: "r1",
      bookingId: "b2",
      startsAt: "2026-10-06T08:00:00Z",
      endsAt: "2026-10-06T08:30:00Z",
      startLocal: "2026-10-06T11:00:00",
      endLocal: "2026-10-06T11:30:00",
      currentStartsAt: "2026-10-05T08:00:00Z",
      expiresAt: "2026-10-05T07:00:00Z",
      serviceName: "Szakáll",
      customerName: "Fekete Béla",
    },
  ],
  privateEvents: [
    {
      kind: "private",
      eventId: "e1",
      occurrenceDate: "2026-10-06",
      startsAt: "2026-10-06T09:00:00Z",
      endsAt: "2026-10-06T09:15:00Z",
      startLocal: "2026-10-06T12:00:00",
      endLocal: "2026-10-06T12:15:00",
      title: "Szünet",
      note: null,
      allDay: false,
      repeat: "none",
      repeatUntil: null,
    },
    {
      kind: "private",
      eventId: "e2",
      occurrenceDate: "2026-10-07",
      startsAt: "2026-10-07T14:00:00Z",
      endsAt: "2026-10-07T15:00:00Z",
      startLocal: "2026-10-07T17:00:00",
      endLocal: "2026-10-07T18:00:00",
      title: "Edzés",
      note: null,
      allDay: false,
      repeat: "weekly",
      repeatUntil: null,
    },
  ],
  workingHours: [{ weekday: 1, start: "09:00", end: "13:00" }],
};

describe("toEventInputs", () => {
  const events = toEventInputs(data);
  const byId = (id: string) => events.find((e) => e.id === id)!;

  it("helyi (lebegő) időt ad a naptárnak, színosztállyal", () => {
    expect(byId("booking:b1")).toMatchObject({
      title: "Tóth Anna · Hajvágás",
      start: "2026-10-05T10:00:00",
      classNames: ["ct-event", "ct-event-pending"],
      editable: false,
    });
  });

  it("egy rövid szünet is külön, húzható eseményként jelenik meg", () => {
    expect(byId("private:e1:2026-10-06")).toMatchObject({ title: "Szünet", end: "2026-10-06T12:15:00", editable: true });
    expect(byId("private:e1:2026-10-06").classNames).toContain("ct-event-private");
  });

  it("heti sorozat alkalma nem húzható (a szerkesztőben módosítható)", () => {
    expect(byId("private:e2:2026-10-07")).toMatchObject({ editable: false });
  });

  it("megerősített foglalás húzható (áthelyezés), de nem nyújtható; a javaslat külön, mozdíthatatlan esemény", () => {
    expect(byId("booking:b2")).toMatchObject({ editable: true, durationEditable: false });
    expect(byId("proposal:r1")).toMatchObject({
      title: "Javaslat: Fekete Béla · Szakáll",
      start: "2026-10-06T11:00:00",
      classNames: ["ct-event", "ct-event-proposal"],
      editable: false,
    });
  });
});

describe("toBusinessHours", () => {
  it("munkaidő-sávok napokra", () => {
    expect(toBusinessHours(data.workingHours)).toEqual([{ daysOfWeek: [1], startTime: "09:00", endTime: "13:00" }]);
  });
});
