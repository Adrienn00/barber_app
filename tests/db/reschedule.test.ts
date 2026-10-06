import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDaysToDate, bucharestToUtc } from "../../src/shared/datetime/datetime";
import { ID, anonClient, serviceClient, userClient } from "./helpers";

// Áthelyezés: javaslat (vendég dönt) és közvetlen áthelyezés. Peti jövő csütörtökén és péntekén dolgozunk,
// hogy a párhuzamosan futó többi teszttel (hétfő, kedd) ne ütközzünk.
const service = serviceClient();
const created: string[] = [];

const tz = "Europe/Bucharest";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const isoWeekday = (d: string) => ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const nextMonday = addDaysToDate(today, 8 - isoWeekday(today));
const thu = addDaysToDate(nextMonday, 3);
const fri = addDaysToDate(nextMonday, 4);
const at = (date: string, time: string) => bucharestToUtc(`${date}T${time}`).toISOString();
const iso = (s: string) => new Date(s).toISOString();

let peti: SupabaseClient;
let laci: SupabaseClient;
let anna: SupabaseClient;
let bela: SupabaseClient;

/** Megerősített foglalás Petinél (30 perc + 5 perc puffer), közvetlenül beszúrva */
async function confirmed(date: string, time: string, customer: string | null = ID.users.anna) {
  const start = at(date, time);
  const { data, error } = await service
    .from("bookings")
    .insert({
      barber_id: ID.barbers.peti,
      customer_id: customer,
      guest_name: customer ? null : "Vendég Géza",
      guest_phone: customer ? null : "+40 755 111 222",
      service_id: ID.services.petiHajvagas,
      starts_at: start,
      ends_at: new Date(Date.parse(start) + 30 * 60_000).toISOString(),
      block_end: new Date(Date.parse(start) + 35 * 60_000).toISOString(),
      status: "confirmed",
      decided_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  created.push(data.id);
  return data.id as string;
}

async function bookingOf(id: string) {
  const { data } = await service.from("bookings").select("status, starts_at, ends_at, block_end, moved_from").eq("id", id).single();
  return data!;
}
async function proposalOf(id: string) {
  const { data } = await service.from("booking_reschedules").select("status, needs_decision").eq("id", id).single();
  return data!;
}
async function slotsOn(date: string) {
  const { data } = await anonClient().rpc("get_available_slots", {
    p_barber_id: ID.barbers.peti,
    p_service_id: ID.services.petiHajvagas,
    p_date: date,
  });
  return (data as { starts_at: string }[]).map((s) => iso(s.starts_at));
}

beforeAll(async () => {
  [peti, laci, anna, bela] = await Promise.all([
    userClient("peti@barber.test"),
    userClient("laci@barber.test"),
    userClient("anna@vendeg.test"),
    userClient("bela@vendeg.test"),
  ]);
});

afterAll(async () => {
  if (created.length) await service.from("bookings").delete().in("id", created);
  await service.from("barber_customers").delete().eq("barber_id", ID.barbers.peti).eq("customer_id", ID.users.bela);
});

describe("Javaslat", () => {
  it("csak a foglalás barbere javasolhat; a vendég, más barber és látogató nem", async () => {
    const id = await confirmed(thu, "09:00");
    for (const db of [anna, laci, anonClient()]) {
      const res = await db.rpc("propose_reschedule", { p_booking_id: id, p_starts_at: at(thu, "16:00") });
      expect(res.error).not.toBeNull();
    }
    // Közvetlenül a táblába senki nem írhat
    const direct = await peti.from("booking_reschedules").insert({
      booking_id: id, barber_id: ID.barbers.peti, customer_id: ID.users.anna,
      starts_at: at(thu, "16:00"), ends_at: at(thu, "16:30"), block_end: at(thu, "16:35"), expires_at: at(thu, "15:00"),
    });
    expect(direct.error).not.toBeNull();
  });

  it("a javasolt idő foglalt marad: másnak nem kínálja, kérni sem lehet; a vendég elfogadja → átkerül", async () => {
    const id = await confirmed(thu, "09:45");
    expect(await slotsOn(thu)).toContain(at(thu, "16:30"));
    const { data: rid, error } = await peti.rpc("propose_reschedule", {
      p_booking_id: id, p_starts_at: at(thu, "16:30"), p_note: "Délelőtt nem érek rá",
    });
    expect(error).toBeNull();

    expect(await slotsOn(thu)).not.toContain(at(thu, "16:30"));
    const steal = await bela.rpc("request_booking", { p_service_id: ID.services.petiHajvagas, p_starts_at: at(thu, "16:30") });
    expect(steal.error).not.toBeNull();
    // Másik javaslat sem kerülhet rá
    const other = await confirmed(thu, "11:00");
    expect((await peti.rpc("propose_reschedule", { p_booking_id: other, p_starts_at: at(thu, "16:30") })).error?.code).toBe("23P01");

    // A vendég látja, más nem; Béla nem válaszolhat helyette
    expect((await anna.from("booking_reschedules").select("id").eq("id", rid)).data).toHaveLength(1);
    expect((await bela.from("booking_reschedules").select("id").eq("id", rid)).data).toHaveLength(0);
    expect((await bela.rpc("respond_reschedule", { p_reschedule_id: rid, p_accept: true })).error?.code).toBe("42501");
    expect((await peti.rpc("respond_reschedule", { p_reschedule_id: rid, p_accept: true })).error?.code).toBe("42501");

    const mine = (await anna.rpc("get_my_bookings")).data as { id: string; proposal_id: string | null }[];
    expect(mine.find((b) => b.id === id)?.proposal_id).toBe(rid);

    expect((await anna.rpc("respond_reschedule", { p_reschedule_id: rid, p_accept: true })).error).toBeNull();
    const moved = await bookingOf(id);
    expect(iso(moved.starts_at)).toBe(at(thu, "16:30"));
    expect(iso(moved.block_end)).toBe(at(thu, "17:05")); // a puffer is vele megy
    expect(iso(moved.moved_from!)).toBe(at(thu, "09:45"));
    expect((await proposalOf(rid)).status).toBe("accepted");
    // A régi idő felszabadult
    expect(await slotsOn(thu)).toContain(at(thu, "09:45"));
    // Másodszor már nem lehet válaszolni
    expect((await anna.rpc("respond_reschedule", { p_reschedule_id: rid, p_accept: false })).error?.code).toBe("22023");
  });

  it("elutasítás → a régi marad, a barbernek döntenie kell (marad / lemondás csak indoklással)", async () => {
    const id = await confirmed(fri, "09:00");
    const { data: rid } = await peti.rpc("propose_reschedule", { p_booking_id: id, p_starts_at: at(fri, "15:00") });
    expect((await anna.rpc("respond_reschedule", { p_reschedule_id: rid, p_accept: false })).error).toBeNull();
    expect(await proposalOf(rid)).toMatchObject({ status: "declined", needs_decision: true });
    expect(iso((await bookingOf(id)).starts_at)).toBe(at(fri, "09:00"));
    expect(await slotsOn(fri)).toContain(at(fri, "15:00"));

    // Csak Peti dönthet; lemondás indoklás nélkül nem megy
    expect((await laci.rpc("resolve_reschedule", { p_reschedule_id: rid, p_keep: true })).error?.code).toBe("42501");
    expect((await anna.rpc("resolve_reschedule", { p_reschedule_id: rid, p_keep: true })).error?.code).toBe("42501");
    expect((await peti.rpc("resolve_reschedule", { p_reschedule_id: rid, p_keep: false })).error).not.toBeNull();
    expect((await peti.rpc("resolve_reschedule", { p_reschedule_id: rid, p_keep: false, p_note: "Sajnos nem megy" })).error).toBeNull();
    expect((await bookingOf(id)).status).toBe("cancelled");
    expect((await proposalOf(rid)).needs_decision).toBe(false);
  });

  it("lejárt javaslat: nem lehet elfogadni, az idő felszabadul, a barbernek döntenie kell („marad”)", async () => {
    const id = await confirmed(fri, "10:00");
    const { data: rid } = await peti.rpc("propose_reschedule", { p_booking_id: id, p_starts_at: at(fri, "16:00") });
    await service.from("booking_reschedules").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", rid);

    expect(await slotsOn(fri)).toContain(at(fri, "16:00"));
    expect((await anna.rpc("respond_reschedule", { p_reschedule_id: rid, p_accept: true })).error?.code).toBe("22023");

    // A lejáratot az időzítő (vagy a barber következő javaslata) állítja át – itt egy másik javaslat váltja ki
    const other = await confirmed(fri, "11:00");
    const { data: other_rid } = await peti.rpc("propose_reschedule", { p_booking_id: other, p_starts_at: at(fri, "17:00") });
    expect(await proposalOf(rid)).toMatchObject({ status: "expired", needs_decision: true });

    expect((await peti.rpc("resolve_reschedule", { p_reschedule_id: rid, p_keep: true })).error).toBeNull();
    expect((await proposalOf(rid)).needs_decision).toBe(false);
    expect((await bookingOf(id)).status).toBe("confirmed");
    expect((await peti.rpc("resolve_reschedule", { p_reschedule_id: rid, p_keep: true })).error?.code).toBe("22023");

    // A barber visszavonhatja a függő javaslatát; más nem
    expect((await laci.rpc("withdraw_reschedule", { p_reschedule_id: other_rid })).error).not.toBeNull();
    expect((await peti.rpc("withdraw_reschedule", { p_reschedule_id: other_rid })).error).toBeNull();
    expect((await proposalOf(other_rid)).status).toBe("withdrawn");
  });

  it("ha a vendég lemondja a foglalást, a függő javaslat is megszűnik; fiók nélküli vendégnek nem lehet javasolni", async () => {
    const id = await confirmed(fri, "12:00");
    const { data: rid } = await peti.rpc("propose_reschedule", { p_booking_id: id, p_starts_at: at(fri, "17:30") });
    expect((await anna.rpc("cancel_booking", { p_booking_id: id })).error).toBeNull();
    expect(await proposalOf(rid)).toMatchObject({ status: "withdrawn", needs_decision: false });

    const guest = await confirmed(fri, "12:45", null);
    expect((await peti.rpc("propose_reschedule", { p_booking_id: guest, p_starts_at: at(fri, "17:30") })).error?.code).toBe("22023");
  });
});

describe("Közvetlen áthelyezés", () => {
  it("a barber azonnal áthelyezheti (munkaidőn kívülre is), ütközésre nem; más nem", async () => {
    const id = await confirmed(thu, "12:00");
    const blocker = await confirmed(thu, "14:00");

    expect((await peti.rpc("move_booking", { p_booking_id: id, p_starts_at: at(thu, "14:15") })).error?.code).toBe("23P01");
    expect((await anna.rpc("move_booking", { p_booking_id: id, p_starts_at: at(thu, "19:00") })).error?.code).toBe("42501");
    expect((await laci.rpc("move_booking", { p_booking_id: id, p_starts_at: at(thu, "19:00") })).error?.code).toBe("42501");
    expect((await peti.rpc("move_booking", { p_booking_id: id, p_starts_at: new Date(Date.now() - 3600_000).toISOString() })).error?.code).toBe("22023");

    // 19:00 munkaidőn kívül van – a barber döntése, szabad
    expect((await peti.rpc("move_booking", { p_booking_id: id, p_starts_at: at(thu, "19:00"), p_note: "Telefonon megbeszéltük" })).error).toBeNull();
    const moved = await bookingOf(id);
    expect(iso(moved.starts_at)).toBe(at(thu, "19:00"));
    expect(iso(moved.moved_from!)).toBe(at(thu, "12:00"));
    expect(blocker).toBeTruthy();
  });

  it("fiók nélküli (kézi) vendég foglalása is áthelyezhető; a függő javaslatot visszavonja", async () => {
    const guest = await confirmed(thu, "17:30", null);
    expect((await peti.rpc("move_booking", { p_booking_id: guest, p_starts_at: at(thu, "18:15") })).error).toBeNull();

    const id = await confirmed(thu, "08:00");
    const { data: rid } = await peti.rpc("propose_reschedule", { p_booking_id: id, p_starts_at: at(thu, "15:00") });
    expect((await peti.rpc("move_booking", { p_booking_id: id, p_starts_at: at(thu, "15:30") })).error).toBeNull();
    expect((await proposalOf(rid)).status).toBe("withdrawn");
  });
});
