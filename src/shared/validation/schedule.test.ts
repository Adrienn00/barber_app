import { describe, expect, it } from "vitest";
import { type DayHours, validateBookingRules, validateWorkingHours } from "./schedule";

const monday = (ranges: { start: string; end: string }[], open = true): DayHours => ({ weekday: 1, open, ranges });

describe("validateWorkingHours", () => {
  it("ebédszünetes nap két sávval, zárt nap kimarad", () => {
    const r = validateWorkingHours([
      monday([
        { start: "14:00", end: "18:00" },
        { start: "09:00", end: "13:00" },
      ]),
      { weekday: 0, open: false, ranges: [] },
    ]);
    expect(r).toEqual({
      ok: true,
      data: [
        { weekday: 1, start: "09:00", end: "13:00" },
        { weekday: 1, start: "14:00", end: "18:00" },
      ],
    });
  });

  it("egymást fedő sávok, fordított idő, üres nyitott nap → hiba a napnál", () => {
    expect(validateWorkingHours([monday([{ start: "09:00", end: "13:00" }, { start: "12:00", end: "15:00" }])])).toMatchObject({
      ok: false,
      fieldErrors: { "day-1": expect.stringContaining("fedhetik") },
    });
    expect(validateWorkingHours([monday([{ start: "18:00", end: "09:00" }])]).ok).toBe(false);
    expect(validateWorkingHours([monday([])]).ok).toBe(false);
  });
});

describe("validateBookingRules", () => {
  const ok = { minNoticeMin: "120", maxDaysAhead: "30", approvalTimeoutMin: "120", cancelLimitHours: "24", bufferMin: "5", slotStepMin: "15" };

  it("a felkínált értékeket elfogadja", () => {
    expect(validateBookingRules(ok)).toEqual({
      ok: true,
      data: { minNoticeMin: 120, maxDaysAhead: 30, approvalTimeoutMin: 120, cancelLimitHours: 24, bufferMin: 5, slotStepMin: 15 },
    });
  });

  it("listán kívüli értéket elutasít", () => {
    expect(validateBookingRules({ ...ok, bufferMin: "7" })).toMatchObject({ ok: false, fieldErrors: { bufferMin: expect.any(String) } });
  });
});
