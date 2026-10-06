import { describe, expect, it } from "vitest";
import { upcomingDays, weekdayOf } from "./days";

describe("upcomingDays", () => {
  it("bukaresti helyi nappal indul, zárt napok jelölve", () => {
    // UTC szerint még vasárnap 22:30, Bukarestben már hétfő 01:30
    const days = upcomingDays(3, [1, 2, 3, 4, 5], new Date("2026-10-11T22:30:00Z"));
    expect(days).toEqual([
      { date: "2026-10-12", weekdayShort: "Ma", label: "10. 12.", dayNumber: "12", monthShort: "okt.", open: true },
      { date: "2026-10-13", weekdayShort: "K", label: "10. 13.", dayNumber: "13", monthShort: "okt.", open: true },
      { date: "2026-10-14", weekdayShort: "Sze", label: "10. 14.", dayNumber: "14", monthShort: "okt.", open: true },
    ]);
  });

  it("weekdayOf: 0 = vasárnap", () => {
    expect(weekdayOf("2026-10-11")).toBe(0);
    expect(weekdayOf("2026-10-17")).toBe(6);
  });
});
