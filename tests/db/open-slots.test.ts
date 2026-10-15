import { afterAll, describe, expect, it } from "vitest";
import { addDaysToDate } from "../../src/shared/datetime/datetime";
import { ID, anonClient, serviceClient } from "./helpers";

// „Ma még szabad”: a kezdőlap szabad időpontjai – ugyanazok, mint a foglalásnál, csak listázott barbereknél.
const service = serviceClient();
const tz = "Europe/Bucharest";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const isoWeekday = (d: string) => ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const nextWednesday = addDaysToDate(today, 8 - isoWeekday(today) + 2);

type OpenSlot = { barber_slug: string; service_id: string; starts_at: string } & Record<string, unknown>;

async function openSlots(perBarber = 4) {
  const res = await anonClient().rpc("get_open_slots", { p_date: nextWednesday, p_per_barber: perBarber });
  expect(res.error).toBeNull();
  return res.data as OpenSlot[];
}

async function slugOf(barberId: string) {
  const { data } = await service.from("barbers").select("slug").eq("id", barberId).single();
  return data!.slug as string;
}

afterAll(async () => {
  await service.from("barbers").update({ is_listed: true }).eq("id", ID.barbers.laci);
});

describe("„Ma még szabad” (get_open_slots)", () => {
  it("bejelentkezés nélkül is lekérhető; csak valódi szabad időpontokat ad, barberenként legfeljebb a kértet", async () => {
    const rows = await openSlots(3);
    const petiSlug = await slugOf(ID.barbers.peti);
    const peti = rows.filter((r) => r.barber_slug === petiSlug);
    expect(peti.length).toBeGreaterThan(0);
    expect(peti.length).toBeLessThanOrEqual(3);

    // Ugyanazok, mint amit a foglalás kínál (a fő szolgáltatásra)
    const { data: real } = await anonClient().rpc("get_available_slots", {
      p_barber_id: ID.barbers.peti,
      p_service_id: peti[0].service_id,
      p_date: nextWednesday,
    });
    const realTimes = (real as { starts_at: string }[]).map((s) => s.starts_at);
    expect(peti.map((r) => r.starts_at)).toEqual(realTimes.slice(0, peti.length));

    // A barber belső azonosítója nem kerül ki
    expect(Object.keys(rows[0])).not.toContain("barber_id");
    expect(JSON.stringify(rows)).not.toContain(ID.barbers.peti);
  });

  it("a listából kikapcsolt barber nem jelenik meg", async () => {
    const laciSlug = await slugOf(ID.barbers.laci);
    await service.from("barbers").update({ is_listed: false }).eq("id", ID.barbers.laci);
    const rows = await openSlots();
    expect(rows.some((r) => r.barber_slug === laciSlug)).toBe(false);
  });
});
