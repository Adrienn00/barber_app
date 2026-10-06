import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDaysToDate, bucharestToUtc } from "../../src/shared/datetime/datetime";
import { ID, serviceClient, userClient } from "./helpers";

const service = serviceClient();
const created: string[] = [];

const tz = "Europe/Bucharest";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const isoWeekday = (d: string) => ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const nextMonday = addDaysToDate(today, 8 - isoWeekday(today));
const nextTuesday = addDaysToDate(nextMonday, 1);
const at = (date: string, time: string) => bucharestToUtc(`${date}T${time}`).toISOString();

let peti: SupabaseClient;
let laci: SupabaseClient;
let anna: SupabaseClient;
let bela: SupabaseClient;

async function request(db: SupabaseClient, startsAt: string) {
  const res = await db.rpc("request_booking", { p_service_id: ID.services.petiHajvagas, p_starts_at: startsAt });
  if (res.data) created.push(res.data as string);
  return res;
}
async function statusOf(id: string) {
  const { data } = await service.from("bookings").select("status, cancelled_by, decision_note").eq("id", id).single();
  return data!;
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
  // Béla a teszt miatt Peti vendége lett – ezt is visszaállítjuk (más tesztek a seed állapotát várják)
  await service.from("barber_customers").delete().eq("barber_id", ID.barbers.peti).eq("customer_id", ID.users.bela);
  await service.from("barber_settings").update({ cancel_limit_hours: 24 }).eq("barber_id", ID.barbers.peti);
});

describe("Jóváhagyás", () => {
  it("csak a saját barbere hagyhatja jóvá; másodszor már nem", async () => {
    const { data: id } = await request(anna, at(nextMonday, "09:00"));
    expect((await bela.rpc("approve_booking", { p_booking_id: id })).error).not.toBeNull();
    expect((await laci.rpc("approve_booking", { p_booking_id: id })).error?.code).toBe("22023");
    expect(await statusOf(id)).toMatchObject({ status: "pending" });

    expect((await peti.rpc("approve_booking", { p_booking_id: id })).error).toBeNull();
    expect(await statusOf(id)).toMatchObject({ status: "confirmed" });
    expect((await peti.rpc("approve_booking", { p_booking_id: id })).error?.code).toBe("22023");
  });

  it("lejárt kérést már nem lehet jóváhagyni", async () => {
    const { data: id } = await request(anna, at(nextTuesday, "16:00"));
    await service.from("bookings").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", id);
    expect((await peti.rpc("approve_booking", { p_booking_id: id })).error?.message).toContain("nem hagyható jóvá");
    // Nem lett megerősítve; a „lejárt” állapotot a percenkénti ütemezett feladat állítja be
    expect((await statusOf(id)).status).not.toBe("confirmed");
  });
});

describe("Elutasítás és alternatív időpontok", () => {
  let rejectedId: string;

  it("elutasítás indoklással; az időpont újra szabad lesz", async () => {
    const { data: id } = await request(anna, at(nextMonday, "14:00"));
    rejectedId = id as string;
    expect((await peti.rpc("reject_booking", { p_booking_id: id, p_note: "Aznap délután zárva leszek." })).error).toBeNull();
    expect(await statusOf(rejectedId)).toMatchObject({ status: "rejected", decision_note: "Aznap délután zárva leszek." });

    const { data: slots } = await anna.rpc("get_available_slots", {
      p_barber_id: ID.barbers.peti,
      p_service_id: ID.services.petiHajvagas,
      p_date: nextMonday,
    });
    expect((slots as { starts_at: string }[]).map((s) => new Date(s.starts_at).toISOString())).toContain(at(nextMonday, "14:00"));
  });

  it("a vendég 3 alternatív időpontot kap (ugyanannál a barbernél), más vendég semmit", async () => {
    const { data } = await anna.rpc("get_alternative_slots", { p_booking_id: rejectedId });
    const times = (data as { starts_at: string }[]).map((s) => new Date(s.starts_at).toISOString());
    expect(times).toHaveLength(3);
    expect(times[0]).toBe(at(nextMonday, "14:00")); // a felszabadult időponttól kezdve
    expect((await bela.rpc("get_alternative_slots", { p_booking_id: rejectedId })).data).toEqual([]);
  });
});

describe("Lejárat", () => {
  it("lejárt függő kérés nem foglalja az időt: más kérheti, a régi „lejárt” lesz", async () => {
    const { data: oldId } = await request(anna, at(nextTuesday, "17:00"));
    await service.from("bookings").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", oldId);

    const res = await request(bela, at(nextTuesday, "17:00"));
    expect(res.error).toBeNull();
    expect((await statusOf(oldId)).status).toBe("expired");
  });
});

describe("Lemondás", () => {
  it("a vendég a függő kérését lemondhatja", async () => {
    const { data: id } = await request(anna, at(nextTuesday, "09:00"));
    expect((await anna.rpc("cancel_booking", { p_booking_id: id })).error).toBeNull();
    expect(await statusOf(id)).toMatchObject({ status: "cancelled", cancelled_by: "customer" });
  });

  it("megerősítettet a vendég csak a határidő előtt; utána nem", async () => {
    const { data: id } = await request(anna, at(nextTuesday, "10:00"));
    await peti.rpc("approve_booking", { p_booking_id: id });
    // A foglalást 5 órával mostanra tesszük: a 24 órás lemondási határidőn belül van
    const start = new Date(Date.now() + 5 * 3600_000);
    await service
      .from("bookings")
      .update({
        starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + 30 * 60_000).toISOString(),
        block_end: new Date(start.getTime() + 35 * 60_000).toISOString(),
      })
      .eq("id", id);
    expect((await anna.rpc("cancel_booking", { p_booking_id: id })).error?.message).toContain("határidő");
    // Ha a határidő rövidebb (0 óra), már lemondható
    await service.from("barber_settings").update({ cancel_limit_hours: 0 }).eq("barber_id", ID.barbers.peti);
    expect((await anna.rpc("cancel_booking", { p_booking_id: id })).error).toBeNull();
    await service.from("barber_settings").update({ cancel_limit_hours: 24 }).eq("barber_id", ID.barbers.peti);
  });

  it("a barber lemondhatja (megerősítettnél kötelező indoklással); más barber és idegen vendég nem", async () => {
    const { data: id } = await request(anna, at(nextTuesday, "11:00"));
    await peti.rpc("approve_booking", { p_booking_id: id });
    expect((await laci.rpc("cancel_booking", { p_booking_id: id, p_note: "x" })).error?.code).toBe("42501");
    expect((await bela.rpc("cancel_booking", { p_booking_id: id })).error?.code).toBe("42501");
    expect((await peti.rpc("cancel_booking", { p_booking_id: id })).error?.message).toContain("okát");
    expect((await peti.rpc("cancel_booking", { p_booking_id: id, p_note: "Beteg lettem, elnézést!" })).error).toBeNull();
    expect(await statusOf(id)).toMatchObject({ status: "cancelled", cancelled_by: "barber", decision_note: "Beteg lettem, elnézést!" });
  });

  it("múltbeli foglalást nem lehet lemondani", async () => {
    const { data: svc } = await service.from("services").select("id").eq("id", ID.services.petiHajvagas).single();
    const { data } = await service
      .from("bookings")
      .insert({
        barber_id: ID.barbers.peti,
        customer_id: ID.users.anna,
        service_id: svc!.id,
        starts_at: "2020-01-06T08:00:00Z",
        ends_at: "2020-01-06T08:30:00Z",
        block_end: "2020-01-06T08:30:00Z",
        status: "confirmed",
      })
      .select("id")
      .single();
    created.push(data!.id);
    expect((await anna.rpc("cancel_booking", { p_booking_id: data!.id })).error?.code).toBe("22023");
  });
});
