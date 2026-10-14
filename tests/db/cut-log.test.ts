import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, PASSWORD, anonClient, serviceClient, userClient } from "./helpers";

// Vágásnapló (fotó + jegyzet) és „Ideje vágatni” emlékeztető: ki írhat, ki láthat, és mit NEM szabad.
const service = serviceClient();
const createdUsers: string[] = [];
const createdBookings: string[] = [];
const uploaded: string[] = [];
const startedAt = new Date().toISOString();
const DAY = 86_400_000;

// 1×1 pixeles PNG
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);

let peti: SupabaseClient;
let laci: SupabaseClient;
let anna: SupabaseClient;

/** Új vendégfiók (a tesztek végén törlődik) */
async function newCustomer(tag: string) {
  const email = `${tag}-${Date.now()}@vendeg.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Teszt Vendég", phone: "+40745000888" },
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  return { id: data.user.id, db: await userClient(email) };
}

/** Foglalás közvetlenül beszúrva; az időpont percre „egyedi”, hogy ne ütközzön más tesztekkel */
let offset = 0;
async function insertBooking(
  customerId: string,
  daysFromNow: number,
  opts: { status?: string; barberId?: string; serviceId?: string } = {},
) {
  offset += 1;
  const start = new Date(Math.floor((Date.now() + daysFromNow * DAY) / 60_000) * 60_000 + offset * 40 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000).toISOString();
  const status = opts.status ?? "confirmed";
  const { data, error } = await service
    .from("bookings")
    .insert({
      barber_id: opts.barberId ?? ID.barbers.peti,
      customer_id: customerId,
      service_id: opts.serviceId ?? ID.services.petiHajvagas,
      starts_at: start.toISOString(),
      ends_at: end,
      block_end: end,
      status,
      decided_at: status === "pending" ? null : new Date().toISOString(),
      cancelled_by: status === "cancelled" ? "barber" : null,
      expires_at: status === "pending" ? new Date(Date.now() + DAY).toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  createdBookings.push(data.id);
  return data.id as string;
}

async function upload(db: SupabaseClient, path: string) {
  const res = await db.storage.from("cuts").upload(path, PNG, { contentType: "image/png" });
  if (!res.error) uploaded.push(path);
  return res;
}

async function rebookNotes(userId: string) {
  const { data } = await service
    .from("notifications")
    .select("title, body, data")
    .eq("user_id", userId)
    .eq("type", "rebook")
    .gte("created_at", startedAt);
  return data ?? [];
}

beforeAll(async () => {
  [peti, laci, anna] = await Promise.all([
    userClient("peti@barber.test"),
    userClient("laci@barber.test"),
    userClient("anna@vendeg.test"),
  ]);
});

afterAll(async () => {
  if (uploaded.length) await service.storage.from("cuts").remove(uploaded);
  if (createdBookings.length) await service.from("bookings").delete().in("id", createdBookings);
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
  await service.from("notifications").delete().eq("type", "rebook").gte("created_at", startedAt);
});

describe("Vágásnapló", () => {
  it("a barber a lezajlott foglaláshoz jegyzetet ír; a vendég látja, más vendég és más barber nem", async () => {
    const customer = await newCustomer("naplo");
    const booking = await insertBooking(customer.id, -203);

    const insert = await peti.from("cut_notes").insert({ booking_id: booking, barber_id: ID.barbers.peti, note: "Oldalt 1-es fade" });
    expect(insert.error).toBeNull();

    expect((await customer.db.from("cut_notes").select("note").eq("booking_id", booking)).data).toEqual([{ note: "Oldalt 1-es fade" }]);
    expect((await anna.from("cut_notes").select("note").eq("booking_id", booking)).data).toHaveLength(0);
    expect((await laci.from("cut_notes").select("note").eq("booking_id", booking)).data).toHaveLength(0);
    expect((await anonClient().from("cut_notes").select("note").eq("booking_id", booking)).data ?? []).toHaveLength(0);

    // Módosítás: a barber igen, a vendég nem (0 sor vagy hiba)
    expect((await peti.from("cut_notes").update({ note: "Oldalt 2-es" }).eq("booking_id", booking)).error).toBeNull();
    await customer.db.from("cut_notes").update({ note: "Hamis" }).eq("booking_id", booking);
    await customer.db.from("cut_notes").delete().eq("booking_id", booking);
    const { data } = await service.from("cut_notes").select("note").eq("booking_id", booking).single();
    expect(data!.note).toBe("Oldalt 2-es");
  });

  it("NEM írhat: jövőbeli, függő, lemondott foglaláshoz, más barber foglalásához, és a vendég sem", async () => {
    const customer = await newCustomer("tilos");
    const future = await insertBooking(customer.id, 302);
    const pending = await insertBooking(customer.id, -202, { status: "pending" });
    const cancelled = await insertBooking(customer.id, -202, { status: "cancelled" });
    const laciBooking = await insertBooking(customer.id, -202, { barberId: ID.barbers.laci, serviceId: ID.services.laciHajvagas });
    const own = await insertBooking(customer.id, -204);

    for (const id of [future, pending, cancelled]) {
      expect((await peti.from("cut_notes").insert({ booking_id: id, barber_id: ID.barbers.peti, note: "x" })).error).not.toBeNull();
    }
    expect((await peti.from("cut_notes").insert({ booking_id: laciBooking, barber_id: ID.barbers.peti, note: "x" })).error).not.toBeNull();
    expect((await peti.from("cut_notes").insert({ booking_id: laciBooking, barber_id: ID.barbers.laci, note: "x" })).error).not.toBeNull();
    expect((await customer.db.from("cut_notes").insert({ booking_id: own, barber_id: ID.barbers.peti, note: "x" })).error).not.toBeNull();
    // Üres napló és idegen mappára mutató fotó sem
    expect((await peti.from("cut_notes").insert({ booking_id: own, barber_id: ID.barbers.peti })).error).not.toBeNull();
    expect(
      (await peti.from("cut_notes").insert({ booking_id: own, barber_id: ID.barbers.peti, photo_path: `${ID.barbers.peti}/${future}/x.webp` })).error,
    ).not.toBeNull();
  });

  it("fotó: a barber csak a saját lezajlott foglalása mappájába tölt fel; a vendég csak a sajátját olvassa", async () => {
    const customer = await newCustomer("foto");
    const booking = await insertBooking(customer.id, -205);
    const future = await insertBooking(customer.id, 303);
    const laciBooking = await insertBooking(customer.id, -205, { barberId: ID.barbers.laci, serviceId: ID.services.laciHajvagas });
    const path = `${ID.barbers.peti}/${booking}/vagas.png`;

    expect((await upload(peti, path)).error).toBeNull();
    expect((await upload(peti, `${ID.barbers.peti}/${future}/x.png`)).error).not.toBeNull();
    expect((await upload(peti, `${ID.barbers.laci}/${laciBooking}/x.png`)).error).not.toBeNull();
    expect((await upload(laci, `${ID.barbers.peti}/${booking}/x.png`)).error).not.toBeNull();
    expect((await upload(customer.db, `${ID.barbers.peti}/${booking}/x.png`)).error).not.toBeNull();

    // Amíg nincs a naplóban, a vendég nem látja; utána igen – más vendég és más barber soha
    expect((await customer.db.storage.from("cuts").createSignedUrl(path, 60)).error).not.toBeNull();
    const insert = await peti.from("cut_notes").insert({ booking_id: booking, barber_id: ID.barbers.peti, photo_path: path });
    expect(insert.error).toBeNull();
    expect((await customer.db.storage.from("cuts").createSignedUrl(path, 60)).error).toBeNull();
    expect((await anna.storage.from("cuts").createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await laci.storage.from("cuts").createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await anonClient().storage.from("cuts").createSignedUrl(path, 60)).error).not.toBeNull();

    // Törölni csak a barber tudja
    await customer.db.storage.from("cuts").remove([path]);
    await laci.storage.from("cuts").remove([path]);
    expect((await peti.storage.from("cuts").createSignedUrl(path, 60)).error).toBeNull();
  });

  it("fióktörléskor a vendég vágásnaplója törlődik", async () => {
    const customer = await newCustomer("torol");
    const booking = await insertBooking(customer.id, -206);
    await peti.from("cut_notes").insert({ booking_id: booking, barber_id: ID.barbers.peti, note: "Törlendő" });
    expect((await customer.db.rpc("prepare_account_deletion")).error).toBeNull();
    expect((await service.from("cut_notes").select("booking_id").eq("booking_id", booking)).data).toHaveLength(0);
  });
});

describe("„Ideje vágatni” emlékeztető", () => {
  it("a szokásos idő letelte után egyszer szól, a legközelebbi szabad időponttal", async () => {
    const customer = await newCustomer("ujra");
    await insertBooking(customer.id, -61);
    await insertBooking(customer.id, -31); // 30 naponta jár → esedékes

    expect((await customer.db.rpc("send_rebook_reminders", { p_any_time: true })).error).not.toBeNull();
    expect((await service.rpc("send_rebook_reminders", { p_any_time: true })).error).toBeNull();
    expect((await service.rpc("send_rebook_reminders", { p_any_time: true })).error).toBeNull(); // nem duplikál

    const notes = await rebookNotes(customer.id);
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toContain("31 napja");
    expect((notes[0].data as { url: string }).url).toContain(`/foglalas?szolgaltatas=${ID.services.petiHajvagas}`);
  });

  it("NEM szól: ha még nem telt le az idő, ha van új foglalása, vagy ha kikapcsolta", async () => {
    const early = await newCustomer("korai");
    await insertBooking(early.id, -40);
    await insertBooking(early.id, -10); // 30 naponta → még 20 nap

    const booked = await newCustomer("foglalt");
    await insertBooking(booked.id, -61);
    await insertBooking(booked.id, -31);
    await insertBooking(booked.id, 5, { status: "pending" });

    const optedOut = await newCustomer("kikapcs");
    await insertBooking(optedOut.id, -61);
    await insertBooking(optedOut.id, -31);
    expect((await optedOut.db.from("profiles").update({ rebook_reminders: false }).eq("id", optedOut.id)).error).toBeNull();
    // Más beállítását nem kapcsolhatja ki
    await optedOut.db.from("profiles").update({ rebook_reminders: false }).eq("id", ID.users.anna);
    const { data: annaProfile } = await service.from("profiles").select("rebook_reminders").eq("id", ID.users.anna).single();
    expect(annaProfile!.rebook_reminders).toBe(true);

    await service.rpc("send_rebook_reminders", { p_any_time: true });
    for (const c of [early, booked, optedOut]) expect(await rebookNotes(c.id)).toHaveLength(0);
  });
});
