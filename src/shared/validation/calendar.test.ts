import { describe, expect, it } from "vitest";
import { type PrivateEventInput, validateManualBooking, validatePrivateEvent } from "./calendar";

const base: PrivateEventInput = {
  title: "Orvos",
  date: "2026-10-25", // az őszi óraátállítás napja
  startTime: "12:00",
  endTime: "13:00",
  allDay: false,
  endDate: "",
  repeatWeekly: false,
  repeatUntil: "",
  note: "",
};

describe("validatePrivateEvent", () => {
  it("helyi időt UTC-re alakít – az óraátállítás napján is", () => {
    const r = validatePrivateEvent(base);
    expect(r.ok && r.data).toMatchObject({
      startsAt: "2026-10-25T10:00:00.000Z", // téli idő: UTC+2
      endsAt: "2026-10-25T11:00:00.000Z",
      repeat: "none",
    });
    const summer = validatePrivateEvent({ ...base, date: "2026-10-24" });
    expect(summer.ok && summer.data.startsAt).toBe("2026-10-24T09:00:00.000Z"); // nyári idő: UTC+3
  });

  it("egész napos esemény helyi éjféltől a következő helyi éjfélig tart (több napos is)", () => {
    const r = validatePrivateEvent({ ...base, allDay: true, startTime: "", endTime: "", date: "2026-10-24", endDate: "2026-10-26" });
    expect(r.ok && r.data).toMatchObject({
      allDay: true,
      startsAt: "2026-10-23T21:00:00.000Z", // okt. 24. 00:00 nyári idő
      endsAt: "2026-10-26T22:00:00.000Z", // okt. 27. 00:00 téli idő
    });
  });

  it("heti ismétlődés záró dátummal", () => {
    const r = validatePrivateEvent({ ...base, repeatWeekly: true, repeatUntil: "2026-12-31" });
    expect(r.ok && r.data).toMatchObject({ repeat: "weekly", repeatUntil: "2026-12-31" });
  });

  it("hibák: üres cím, rossz időrend, korábbi záró dátum", () => {
    const r = validatePrivateEvent({ ...base, title: " ", endTime: "11:00", repeatWeekly: true, repeatUntil: "2026-10-01" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["endTime", "repeatUntil", "title"]);
  });
});

describe("validateManualBooking", () => {
  const input = {
    serviceId: "svc",
    date: "2026-10-26",
    time: "14:30",
    customerId: "",
    guestName: "Telefonos Tibor",
    guestPhone: "0755 111 222",
    note: "",
  };

  it("új vendég: telefon egységesítve, idő UTC-re alakítva", () => {
    const r = validateManualBooking(input);
    expect(r.ok && r.data).toMatchObject({
      startsAt: "2026-10-26T12:30:00.000Z",
      customerId: null,
      guestName: "Telefonos Tibor",
      guestPhone: "+40755111222",
    });
  });

  it("korábbi vendégnél nem kell név és telefon", () => {
    const r = validateManualBooking({ ...input, customerId: "cust", guestName: "", guestPhone: "" });
    expect(r.ok && r.data).toMatchObject({ customerId: "cust", guestName: null, guestPhone: null });
  });

  it("hiányzó adatoknál mezőnkénti hiba", () => {
    const r = validateManualBooking({ ...input, serviceId: "", time: "25:00", guestName: "", guestPhone: "12" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["guestName", "guestPhone", "serviceId", "time"]);
  });
});
