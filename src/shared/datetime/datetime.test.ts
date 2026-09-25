import { describe, expect, it } from "vitest";
import { bucharestToUtc, formatDateHu, formatDateTimeHu } from "./datetime";

describe("formatDateTimeHu", () => {
  it("magyar formátumban, bukaresti időben ír (nyári idő, UTC+3)", () => {
    expect(formatDateTimeHu(new Date("2026-10-03T11:00:00Z"))).toBe("2026. október 3., szombat 14:00");
  });

  it("téli időben UTC+2", () => {
    expect(formatDateTimeHu(new Date("2026-12-01T12:00:00Z"))).toBe("2026. december 1., kedd 14:00");
  });

  it("csak dátum", () => {
    expect(formatDateHu("2026-10-03T11:00:00Z")).toBe("2026. október 3., szombat");
  });
});

describe("bucharestToUtc – óraátállítás", () => {
  it("az őszi átállítás előtti és utáni napon is 14:00 marad a helyi idő", () => {
    // 2026-10-25 04:00 EEST → 03:00 EET
    expect(bucharestToUtc("2026-10-24T14:00").toISOString()).toBe("2026-10-24T11:00:00.000Z");
    expect(bucharestToUtc("2026-10-25T14:00").toISOString()).toBe("2026-10-25T12:00:00.000Z");
  });

  it("a tavaszi átállítás napján is helyes", () => {
    // 2026-03-29 03:00 EET → 04:00 EEST
    expect(bucharestToUtc("2026-03-28T14:00").toISOString()).toBe("2026-03-28T12:00:00.000Z");
    expect(bucharestToUtc("2026-03-29T14:00").toISOString()).toBe("2026-03-29T11:00:00.000Z");
  });
});
