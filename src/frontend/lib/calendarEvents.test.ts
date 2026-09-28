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

  it("helyi (lebegő) időt ad a naptárnak, színosztállyal", () => {
    expect(events[0]).toMatchObject({
      title: "Tóth Anna · Hajvágás",
      start: "2026-10-05T10:00:00",
      classNames: ["ct-event", "ct-event-pending"],
      editable: false,
    });
  });

  it("egy rövid szünet is külön, húzható eseményként jelenik meg", () => {
    expect(events[1]).toMatchObject({ title: "Szünet", end: "2026-10-06T12:15:00", editable: true });
    expect(events[1].classNames).toContain("ct-event-private");
  });

  it("heti sorozat alkalma nem húzható (a szerkesztőben módosítható)", () => {
    expect(events[2]).toMatchObject({ id: "private:e2:2026-10-07", editable: false });
  });
});

describe("toBusinessHours", () => {
  it("munkaidő-sávok napokra", () => {
    expect(toBusinessHours(data.workingHours)).toEqual([{ daysOfWeek: [1], startTime: "09:00", endTime: "13:00" }]);
  });
});
