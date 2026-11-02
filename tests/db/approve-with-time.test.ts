import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bucharestToUtc } from "../../src/shared/datetime/datetime";
import { ID, anonClient, serviceClient, userClient } from "./helpers";

// Jóváhagyás módosított idővel: csak a befejezés → azonnal megerősítve; más kezdés → javaslat a vendégnek,
// elfogadva megerősített, elutasítva / lejárva / visszavonva a kérés függő marad az eredeti időponttal.
// Távoli dátumokon dolgozunk, hogy más tesztekkel ne ütközzünk.
const service = serviceClient();
const created: string[] = [];
const startedAt = new Date().toISOString();
const at = (local: string) => bucharestToUtc(local).toISOString();
const iso = (s: string) => new Date(s).toISOString();

let peti: SupabaseClient;
let laci: SupabaseClient;
let anna: SupabaseClient;
let bela: SupabaseClient;

/** Anna függő kérése Petinél (30 perc + 5 perc puffer), közvetlenül beszúrva */
async function pending(local: string) {
  const start = at(local);
  const { data, error } = await service
    .from("bookings")
    .insert({
      barber_id: ID.barbers.peti,
      customer_id: ID.users.anna,
      service_id: ID.services.petiHajvagas,
      starts_at: start,
      ends_at: new Date(Date.parse(start) + 30 * 60_000).toISOString(),
      block_end: new Date(Date.parse(start) + 35 * 60_000).toISOString(),
      status: "pending",
      expires_at: new Date(Date.now() + 2 * 3600_000).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  created.push(data.id);
  return data.id as string;
}

const approve = (db: SupabaseClient, id: string, startsAt: string, durationMin: number, note?: string) =>
  db.rpc("approve_booking_with_time", { p_booking_id: id, p_starts_at: startsAt, p_duration_min: durationMin, p_note: note });

async function bookingOf(id: string) {
  const { data } = await service
    .from("bookings")
    .select("status, starts_at, ends_at, block_end, expires_at, moved_from")
    .eq("id", id)
    .single();
  return data!;
}
async function proposalFor(bookingId: string) {
  const { data } = await service
    .from("booking_reschedules")
    .select("id, status, needs_decision, starts_at, ends_at, block_end, expires_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data!;
}
async function notes(userId: string, type: string) {
  const { data } = await service
    .from("notifications")
    .select("title, body")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", startedAt);
  return data ?? [];
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
  await service.from("notifications").delete().gte("created_at", startedAt).in("user_id", [ID.users.peti, ID.users.anna]);
});

describe("Ugyanaz a kezdés, más befejezés", () => {
  it("azonnal megerősítve az új hosszal (rövidebb és hosszabb is), a puffer vele megy", async () => {
    const shorter = await pending("2035-04-02T10:00");
    expect((await approve(peti, shorter, at("2035-04-02T10:00"), 20)).data).toBe("approved");
    expect(await bookingOf(shorter)).toMatchObject({ status: "confirmed" });
    const b = await bookingOf(shorter);
    expect(iso(b.ends_at)).toBe(at("2035-04-02T10:20"));
    expect(iso(b.block_end)).toBe(at("2035-04-02T10:25"));

    const longer = await pending("2035-04-02T12:00");
    expect((await approve(peti, longer, at("2035-04-02T12:00"), 45)).data).toBe("approved");
    expect(iso((await bookingOf(longer)).ends_at)).toBe(at("2035-04-02T12:45"));

    // A vendég a megerősítésről értesítést kap, javaslatot nem
    expect((await notes(ID.users.anna, "booking_confirmed")).length).toBeGreaterThanOrEqual(2);
  });

  it("ütközésnél nem engedi, a kérés függő marad", async () => {
    await pending("2035-04-03T11:00");
    const id = await pending("2035-04-03T10:00");
    const res = await approve(peti, id, at("2035-04-03T10:00"), 90);
    expect(res.error?.code).toBe("23P01");
    expect((await bookingOf(id)).status).toBe("pending");
  });
});

describe("Más kezdés → javaslat a vendégnek", () => {
  it("a kérés függő marad; a vendég értesítést kap; a lejárat kitolódik; az új idő foglalt", async () => {
    const id = await pending("2035-04-04T10:00");
    const before = await bookingOf(id);
    expect((await approve(peti, id, at("2035-04-04T14:00"), 40, "Délután jobb")).data).toBe("proposed");

    const b = await bookingOf(id);
    expect(b.status).toBe("pending");
    expect(iso(b.starts_at)).toBe(at("2035-04-04T10:00"));
    expect(Date.parse(b.expires_at!)).toBeGreaterThan(Date.parse(before.expires_at!));

    const p = await proposalFor(id);
    expect(p).toMatchObject({ status: "pending", needs_decision: false });
    expect(iso(p.ends_at)).toBe(at("2035-04-04T14:40"));
    expect(iso(p.block_end)).toBe(at("2035-04-04T14:45"));

    const [n] = await notes(ID.users.anna, "reschedule_proposed");
    expect(n.title).toContain("más időpontot javasol");

    // Az új időpontra más nem foglalhat
    const clash = await service.from("bookings").insert({
      barber_id: ID.barbers.peti, customer_id: ID.users.bela, service_id: ID.services.petiHajvagas,
      starts_at: at("2035-04-04T14:10"), ends_at: at("2035-04-04T14:40"), block_end: at("2035-04-04T14:45"),
      status: "confirmed", decided_at: new Date().toISOString(),
    }).select("id");
    expect(clash.error).not.toBeNull();
  });

  it("a vendég elfogadja → az új időponttal megerősített (nem „áthelyezett”)", async () => {
    const id = await pending("2035-04-05T10:00");
    await approve(peti, id, at("2035-04-05T15:00"), 30);
    const p = await proposalFor(id);
    expect((await anna.rpc("respond_reschedule", { p_reschedule_id: p.id, p_accept: true })).error).toBeNull();

    const b = await bookingOf(id);
    expect(b.status).toBe("confirmed");
    expect(iso(b.starts_at)).toBe(at("2035-04-05T15:00"));
    expect(b.moved_from).toBeNull();
    expect(await notes(ID.users.peti, "reschedule_accepted")).not.toHaveLength(0);
  });

  it("a vendég nemet mond → a kérés függő marad az eredeti időponttal, döntési feladat nélkül; a barber újra dönthet", async () => {
    const id = await pending("2035-04-06T10:00");
    await approve(peti, id, at("2035-04-06T16:00"), 30);
    const p = await proposalFor(id);
    expect((await anna.rpc("respond_reschedule", { p_reschedule_id: p.id, p_accept: false })).error).toBeNull();

    expect(await proposalFor(id)).toMatchObject({ status: "declined", needs_decision: false });
    const b = await bookingOf(id);
    expect(b.status).toBe("pending");
    expect(iso(b.starts_at)).toBe(at("2035-04-06T10:00"));
    const [n] = await notes(ID.users.peti, "reschedule_declined");
    expect(n.body).toContain("újra függő");

    // Újra dönthet: most az eredeti időpontot hagyja jóvá
    expect((await approve(peti, id, at("2035-04-06T10:00"), 30)).data).toBe("approved");
    expect((await bookingOf(id)).status).toBe("confirmed");
  });

  it("lejárt javaslat után a kérés függő marad (nem jár le vele), döntési feladat nélkül", async () => {
    const id = await pending("2035-04-07T10:00");
    await approve(peti, id, at("2035-04-07T16:00"), 30);
    const p = await proposalFor(id);
    await service.from("booking_reschedules").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", p.id);
    // Az időzítő helyett: a barber következő jóváhagyása is lejártatja
    expect((await approve(peti, id, at("2035-04-07T10:00"), 30)).data).toBe("approved");
    expect(await proposalFor(id)).toMatchObject({ status: "expired", needs_decision: false });
  });

  it("a barber visszavonja → a kérés függő marad, jóváhagyható", async () => {
    const id = await pending("2035-04-08T10:00");
    await approve(peti, id, at("2035-04-08T16:00"), 30);
    const p = await proposalFor(id);
    expect((await peti.rpc("withdraw_reschedule", { p_reschedule_id: p.id })).error).toBeNull();
    expect((await bookingOf(id)).status).toBe("pending");
    expect((await approve(peti, id, at("2035-04-08T10:00"), 30)).data).toBe("approved");
  });

  it("egyszerre csak egy javaslat; a vendég lemondja a kérést → a javaslat is megszűnik", async () => {
    const id = await pending("2035-04-09T10:00");
    await approve(peti, id, at("2035-04-09T16:00"), 30);
    expect((await approve(peti, id, at("2035-04-09T17:00"), 30)).error?.code).toBe("22023");
    expect((await anna.rpc("cancel_booking", { p_booking_id: id })).error).toBeNull();
    expect((await proposalFor(id)).status).toBe("withdrawn");
  });
});

describe("Jogosultság és hibás adat", () => {
  it("NEM: más barber, a vendég, más vendég, látogató; lezárt kérés; rossz időtartam; múltbeli kezdés", async () => {
    const id = await pending("2035-04-10T10:00");
    for (const db of [laci, anna, bela, anonClient()]) {
      expect((await approve(db, id, at("2035-04-10T10:00"), 30)).error).not.toBeNull();
    }
    for (const minutes of [0, 4, 481]) {
      expect((await approve(peti, id, at("2035-04-10T10:00"), minutes)).error?.code).toBe("22023");
    }
    expect((await approve(peti, id, new Date(Date.now() - 3600_000).toISOString(), 30)).error?.code).toBe("22023");
    expect((await bookingOf(id)).status).toBe("pending");

    // Lejárt kérés nem hagyható jóvá
    await service.from("bookings").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", id);
    expect((await approve(peti, id, at("2035-04-10T10:00"), 30)).error?.code).toBe("22023");
  });
});
