import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDaysToDate, bucharestToUtc } from "../../src/shared/datetime/datetime";
import { ID, PASSWORD, anonClient, serviceClient, userClient } from "./helpers";

const service = serviceClient();
const createdBookings: string[] = [];
const createdUsers: string[] = [];

// --- Dátumsegédek (bukaresti helyi idő) ------------------------------------------
const tz = "Europe/Bucharest";
const localDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // „2026-10-06”
const localTime = (iso: string) =>
  new Intl.DateTimeFormat("hu-RO", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const isoWeekday = (date: string) => ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1; // H=1 … V=7

/** A jövő hét hétfője (ugyanúgy, mint a seed.sql: date_trunc('week') + 7) */
const today = localDate();
const nextMonday = addDaysToDate(today, 8 - isoWeekday(today));
const at = (date: string, time: string) => bucharestToUtc(`${date}T${time}`).toISOString();

let peti: SupabaseClient;
let anna: SupabaseClient;
let bela: SupabaseClient;

async function slots(db: SupabaseClient, date: string, serviceId: string = ID.services.petiHajvagas, barberId: string = ID.barbers.peti) {
  const { data, error } = await db.rpc("get_available_slots", { p_barber_id: barberId, p_service_id: serviceId, p_date: date });
  if (error) throw error;
  return (data as { starts_at: string }[]).map((s) => localTime(s.starts_at));
}

async function request(db: SupabaseClient, startsAt: string, serviceId: string = ID.services.petiHajvagas) {
  const res = await db.rpc("request_booking", { p_service_id: serviceId, p_starts_at: startsAt, p_note: "teszt" });
  if (res.data) createdBookings.push(res.data as string);
  return res;
}

beforeAll(async () => {
  [peti, anna, bela] = await Promise.all([
    userClient("peti@barber.test"),
    userClient("anna@vendeg.test"),
    userClient("bela@vendeg.test"),
  ]);
});

afterAll(async () => {
  if (createdBookings.length) await service.from("bookings").delete().in("id", createdBookings);
  await service.from("barber_customers").update({ is_trusted: false }).eq("barber_id", ID.barbers.peti);
  await service.from("barber_settings").update({ max_days_ahead: 30 }).eq("barber_id", ID.barbers.peti);
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
});

describe("Szabad időpontok (get_available_slots)", () => {
  it("jövő hétfő: a foglalások (pufferrel) és az ebédszünet kimarad", async () => {
    // Peti: H 9–13 és 14–18, 30 perces hajvágás, 15 perces lépésköz, 5 perc puffer.
    // Foglalt: 10:00–10:30 (+5) és 11:00–11:45 (+5).
    expect(await slots(anonClient(), nextMonday)).toEqual([
      "09:00", "09:15",
      "12:00", "12:15", "12:30",
      "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45",
      "16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30",
    ]);
  });

  it("a magánprogram (egyszeri és heti ismétlődő) foglalt időnek számít", async () => {
    // Szerda 12:00–13:00 Fogorvos → 11:45, 12:00, 12:15, 12:30 kiesik; 11:30 (12:00-ig) még belefér
    const wednesday = await slots(anonClient(), addDaysToDate(nextMonday, 2));
    expect(wednesday).toContain("11:30");
    expect(wednesday.filter((t) => t >= "11:45" && t < "13:00")).toEqual([]);
    // Csütörtök 17:00–18:00 heti Edzés → 16:45 után semmi
    const thursday = await slots(anonClient(), addDaysToDate(nextMonday, 3));
    expect(thursday).toContain("16:30");
    expect(thursday.filter((t) => t > "16:30")).toEqual([]);
  });

  it("zárt nap, múlt, túl távoli nap, idegen szolgáltatás, függő barber → nincs időpont", async () => {
    expect(await slots(anonClient(), addDaysToDate(nextMonday, 6))).toEqual([]); // vasárnap zárva
    expect(await slots(anonClient(), addDaysToDate(today, -1))).toEqual([]);
    expect(await slots(anonClient(), addDaysToDate(today, 60))).toEqual([]); // max. 30 nap
    expect(await slots(anonClient(), nextMonday, ID.services.laciHajvagas)).toEqual([]);
    expect(await slots(anonClient(), nextMonday, ID.services.zoliHajvagas, ID.barbers.zoli)).toEqual([]);
  });

  it("óraátállításkor is helyi 9:00-kor nyit (UTC-ben egy órát ugrik)", async () => {
    await service.from("barber_settings").update({ max_days_ahead: 365 }).eq("barber_id", ID.barbers.peti);
    // A következő óraátállítás: március vagy október utolsó vasárnapja (legalább 3 nap múlva)
    let sunday = "";
    for (let d = 3; d < 400 && !sunday; d++) {
      const date = addDaysToDate(today, d);
      const [, month, day] = date.split("-").map(Number);
      if ((month === 3 || month === 10) && isoWeekday(date) === 7 && day > 24) sunday = date;
    }
    const friday = addDaysToDate(sunday, -2);
    const monday = addDaysToDate(sunday, 1);
    const first = async (date: string) => {
      const { data } = await anonClient().rpc("get_available_slots", {
        p_barber_id: ID.barbers.peti,
        p_service_id: ID.services.petiHajvagas,
        p_date: date,
      });
      return (data as { starts_at: string }[])[0].starts_at;
    };
    const [beforeChange, afterChange] = await Promise.all([first(friday), first(monday)]);
    expect(localTime(beforeChange)).toBe("09:00");
    expect(localTime(afterChange)).toBe("09:00");
    expect(new Date(beforeChange).getUTCHours()).not.toBe(new Date(afterChange).getUTCHours());
  });
});

describe("Foglalási kérés (request_booking)", () => {
  it("szabad időpontra függő kérés jön létre, lejárattal; az időpont eltűnik a kínálatból", async () => {
    const res = await request(anna, at(nextMonday, "09:00"));
    expect(res.error).toBeNull();
    const { data } = await service.from("bookings").select("*").eq("id", res.data).single();
    expect(data).toMatchObject({ status: "pending", customer_id: ID.users.anna, customer_note: "teszt" });
    expect(data!.expires_at).not.toBeNull();
    expect(new Date(data!.block_end).toISOString()).toBe(at(nextMonday, "09:35")); // 30 perc + 5 perc puffer
    expect(await slots(anna, nextMonday)).not.toContain("09:00");
  });

  it("ugyanarra (vagy átfedő) időre más már nem kérhet", async () => {
    const same = await request(bela, at(nextMonday, "09:00"));
    expect(same.error?.message).toContain("nem szabad");
    const overlapping = await request(bela, at(nextMonday, "09:15"));
    expect(overlapping.error?.message).toContain("nem szabad");
  });

  it("munkaidőn kívül, lépésközön kívül, magánprogramra nem lehet kérni", async () => {
    expect((await request(bela, at(nextMonday, "08:00"))).error?.code).toBe("22023");
    expect((await request(bela, at(nextMonday, "14:05"))).error?.code).toBe("22023");
    expect((await request(bela, at(addDaysToDate(nextMonday, 2), "12:00"))).error?.code).toBe("22023");
  });

  it("megbízható vendég kérése azonnal megerősített", async () => {
    await service.from("barber_customers").update({ is_trusted: true }).eq("barber_id", ID.barbers.peti).eq("customer_id", ID.users.anna);
    const res = await request(anna, at(nextMonday, "15:00"));
    expect(res.error).toBeNull();
    const { data } = await service.from("bookings").select("status, expires_at").eq("id", res.data).single();
    expect(data).toEqual({ status: "confirmed", expires_at: null });
  });

  it("saját magához a barber nem foglalhat; kijelentkezve nem lehet; hiányos profillal nem lehet", async () => {
    expect((await request(peti, at(nextMonday, "16:00"))).error?.message).toContain("Saját magadhoz");
    expect((await request(anonClient(), at(nextMonday, "16:00"))).error).not.toBeNull();

    const email = `hianyos-${Date.now()}@vendeg.test`;
    const { data } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    createdUsers.push(data.user!.id);
    const incomplete = await userClient(email);
    expect((await request(incomplete, at(nextMonday, "16:00"))).error?.message).toContain("profilodban");
  });

  it("a vendég a saját foglalását látja, a más vendégét nem", async () => {
    const own = await anna.from("bookings").select("id").in("id", createdBookings);
    expect((own.data ?? []).length).toBeGreaterThan(0);
    const others = await bela.from("bookings").select("id").in("id", createdBookings);
    expect(others.data).toEqual([]);
  });
});
