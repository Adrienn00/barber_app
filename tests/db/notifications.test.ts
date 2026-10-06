import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDaysToDate, bucharestToUtc } from "../../src/shared/datetime/datetime";
import { ID, PASSWORD, anonClient, serviceClient, userClient } from "./helpers";

// Értesítések: melyik eseményről ki kap értesítést, ki mit láthat, és mit NEM szabad.
const service = serviceClient();
const createdBookings: string[] = [];
const createdUsers: string[] = [];
const startedAt = new Date().toISOString();

const tz = "Europe/Bucharest";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const isoWeekday = (d: string) => ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const nextWednesday = addDaysToDate(today, 8 - isoWeekday(today) + 2);
const local = (s: string) => bucharestToUtc(s).toISOString();

let peti: SupabaseClient;
let anna: SupabaseClient;
let bela: SupabaseClient;

/** A felhasználó e teszt óta kapott értesítései (service-szel olvasva) */
async function notesOf(userId: string, type?: string) {
  let query = service.from("notifications").select("type, title, body, data").eq("user_id", userId).gte("created_at", startedAt);
  if (type) query = query.eq("type", type);
  const { data } = await query.order("created_at");
  return data ?? [];
}

/** Egy szabad időpont Petinél jövő szerdán (a többi teszt más napokat használ) */
async function freeWednesdaySlot(skip = 0) {
  const { data } = await anonClient().rpc("get_available_slots", {
    p_barber_id: ID.barbers.peti,
    p_service_id: ID.services.petiHajvagas,
    p_date: nextWednesday,
  });
  return (data as { starts_at: string }[])[skip].starts_at;
}

async function request(db: SupabaseClient, startsAt: string) {
  const res = await db.rpc("request_booking", { p_service_id: ID.services.petiHajvagas, p_starts_at: startsAt });
  expect(res.error).toBeNull();
  createdBookings.push(res.data as string);
  return res.data as string;
}

/** Megerősített foglalás közvetlenül beszúrva (értesítés nélkül: nem a vendég hozza létre) */
async function insertConfirmed(barberId: string, serviceId: string, customer: string, startsAt: string, decidedAt: string) {
  const end = new Date(Date.parse(startsAt) + 30 * 60_000).toISOString();
  const { data, error } = await service
    .from("bookings")
    .insert({
      barber_id: barberId, customer_id: customer, service_id: serviceId,
      starts_at: startsAt, ends_at: end, block_end: end, status: "confirmed", decided_at: decidedAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  createdBookings.push(data.id);
  return data.id as string;
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
  await service.from("barber_customers").delete().eq("barber_id", ID.barbers.peti).eq("customer_id", ID.users.bela);
  await service.from("notifications").delete().gte("created_at", startedAt).in("user_id", [
    ID.users.peti, ID.users.anna, ID.users.bela, ID.users.admin, ID.users.laci,
  ]);
  await service.from("push_subscriptions").delete().like("endpoint", "https://push.example.test/%");
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
});

describe("Foglalási események", () => {
  it("kérés → barber; jóváhagyás → vendég; vendég lemondása → barber", async () => {
    const id = await request(bela, await freeWednesdaySlot());
    const [req] = await notesOf(ID.users.peti, "booking_request");
    expect(req.title).toBe("Új foglalási kérés");
    expect(req.body).toContain("Fekete Béla");
    expect(req.body).toMatch(/október|november|december|január/); // magyar dátum
    expect(req.data).toEqual({ url: "/keresek" });

    expect((await peti.rpc("approve_booking", { p_booking_id: id })).error).toBeNull();
    const [ok] = await notesOf(ID.users.bela, "booking_confirmed");
    expect(ok.body).toContain("Peti Barber");
    expect(ok.body).toContain("órával előtte");

    expect((await bela.rpc("cancel_booking", { p_booking_id: id })).error).toBeNull();
    const [cancel] = await notesOf(ID.users.peti, "booking_cancelled_by_customer");
    expect(cancel.title).toBe("Lemondott foglalás");
    expect(cancel.body).toContain("felszabadult");
  });

  it("elutasítás indoklással → a vendég látja az indoklást", async () => {
    const id = await request(bela, await freeWednesdaySlot(1));
    expect((await peti.rpc("reject_booking", { p_booking_id: id, p_note: "Szabadságon leszek" })).error).toBeNull();
    const [rej] = await notesOf(ID.users.bela, "booking_rejected");
    expect(rej.body).toContain("„Szabadságon leszek”");
  });

  it("a barber kézi foglalásáról senki nem kap értesítést", async () => {
    const before = (await notesOf(ID.users.anna)).length;
    const res = await peti.rpc("create_manual_booking", {
      p_service_id: ID.services.petiHajvagas,
      p_starts_at: local("2032-03-03T10:00"),
      p_customer_id: ID.users.anna,
    });
    expect(res.error).toBeNull();
    createdBookings.push(res.data as string);
    expect((await notesOf(ID.users.anna)).length).toBe(before);
    expect(await notesOf(ID.users.peti, "booking_new")).toHaveLength(0);
  });

  it("áthelyezés: javaslat → vendég; elutasítás → barber; közvetlen áthelyezés → vendég", async () => {
    const id = await insertConfirmed(ID.barbers.peti, ID.services.petiHajvagas, ID.users.anna, local("2032-03-04T10:00"), startedAt);
    const { data: rid } = await peti.rpc("propose_reschedule", { p_booking_id: id, p_starts_at: local("2032-03-04T15:00") });
    expect((await notesOf(ID.users.anna, "reschedule_proposed"))[0].body).toContain("március 4., csütörtök 15:00");

    await anna.rpc("respond_reschedule", { p_reschedule_id: rid, p_accept: false });
    expect((await notesOf(ID.users.peti, "reschedule_declined"))[0].title).toBe("Tóth Anna nem fogadta el az új időpontot");

    await peti.rpc("move_booking", { p_booking_id: id, p_starts_at: local("2032-03-04T16:00") });
    expect((await notesOf(ID.users.anna, "booking_moved"))[0].body).toBe(
      "Új időpont: március 4., csütörtök 16:00 (korábban: március 4., csütörtök 10:00).",
    );
  });
});

describe("Barberjelentkezés", () => {
  it("új jelentkezés → admin; jóváhagyás → a jelentkező", async () => {
    const email = `ertesites-${Date.now()}@barber.test`;
    const { data: created } = await service.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: "Értesítés Ernő", phone: "+40745000777", terms_accepted: "true" },
    });
    createdUsers.push(created.user!.id);
    const db = await userClient(email);
    const { data: barber, error } = await db
      .from("barbers")
      .insert({
        user_id: created.user!.id, slug: `ertesites-${Date.now().toString(36)}`, display_name: "Ernő Barber",
        city: "Brassó", address: "Fő tér 1.", phone: "+40745000777",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect((await notesOf(ID.users.admin, "barber_application")).some((n) => n.body === "Ernő Barber, Brassó")).toBe(true);

    await service.from("barbers").update({ status: "approved" }).eq("id", barber!.id);
    expect((await notesOf(created.user!.id, "barber_approved"))[0].title).toBe("Jóváhagytuk a jelentkezésed");
  });
});

describe("Emlékeztető", () => {
  it("előző nap 18:00 után egyszer megy ki; aznapi foglalásnak és távolinak nem", async () => {
    const soon = new Date(Date.now() + 3 * 3600_000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const due = await insertConfirmed(ID.barbers.laci, ID.services.laciHajvagas, ID.users.bela, soon, twoDaysAgo);
    // Ugyanarra a napra, ma megerősítve → nincs emlékeztető
    const sameDay = await insertConfirmed(
      ID.barbers.laci, ID.services.laciHajvagas, ID.users.anna, new Date(Date.now() + 4 * 3600_000).toISOString(),
      new Date().toISOString(),
    );
    // Egy hét múlva → még nem
    const later = await insertConfirmed(
      ID.barbers.laci, ID.services.laciHajvagas, ID.users.anna, new Date(Date.now() + 7 * 86_400_000).toISOString(), twoDaysAgo,
    );

    // Csak a szerver (időzítő) futtathatja
    expect((await bela.rpc("send_due_reminders")).error).not.toBeNull();
    expect((await service.rpc("send_due_reminders")).error).toBeNull();
    expect((await service.rpc("send_due_reminders")).error).toBeNull(); // másodszor nem duplikál

    const reminders = await notesOf(ID.users.bela, "reminder");
    expect(reminders).toHaveLength(1);
    expect(reminders[0].title).toMatch(/^Emlékeztető: holnap \d{2}:\d{2}$/);
    expect(reminders[0].body).toContain("Laci Borbély");

    const { data } = await service.from("bookings").select("id, reminder_sent_at").in("id", [due, sameDay, later]);
    const sent = Object.fromEntries(data!.map((b) => [b.id, b.reminder_sent_at !== null]));
    expect(sent).toEqual({ [due]: true, [sameDay]: false, [later]: false });
  });
});

describe("Jogosultságok", () => {
  it("mindenki csak a saját értesítéseit látja; csak az olvasottságot módosíthatja; létrehozni nem tud", async () => {
    await request(bela, await freeWednesdaySlot(2));
    const { data: mine } = await peti.from("notifications").select("id, user_id").gte("created_at", startedAt);
    expect(mine!.length).toBeGreaterThan(0);
    expect(mine!.every((n) => n.user_id === ID.users.peti)).toBe(true);
    expect((await bela.from("notifications").select("id").in("id", mine!.map((n) => n.id))).data).toHaveLength(0);
    expect((await anonClient().from("notifications").select("id")).data ?? []).toHaveLength(0);

    const target = mine![0].id;
    expect((await peti.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", target)).error).toBeNull();
    expect((await peti.from("notifications").update({ title: "Hamis" }).eq("id", target)).error).not.toBeNull();
    // Más értesítését nem jelölheti olvasottnak (a sor nem látszik neki → 0 sor módosul)
    const other = await bela.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", target).select("id");
    expect(other.data ?? []).toHaveLength(0);

    const insert = await peti.from("notifications").insert({ user_id: ID.users.bela, type: "x", title: "Hamis" });
    expect(insert.error).not.toBeNull();
  });

  it("push-feliratkozás: csak https, a készülék a belépett felhasználóé lesz; a szerver-függvények tiltottak", async () => {
    const endpoint = `https://push.example.test/${Date.now()}`;
    expect((await anonClient().rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: "k", p_auth: "a" })).error).not.toBeNull();
    expect((await bela.rpc("save_push_subscription", { p_endpoint: "http://rossz.test/x", p_p256dh: "k", p_auth: "a" })).error?.code).toBe("22023");

    expect((await bela.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: "k1", p_auth: "a1" })).error).toBeNull();
    // Ugyanazon a készüléken Anna lép be → az övé lesz, Béla már nem látja
    expect((await anna.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: "k2", p_auth: "a2" })).error).toBeNull();
    expect((await bela.from("push_subscriptions").select("id").eq("endpoint", endpoint)).data).toHaveLength(0);
    expect((await anna.from("push_subscriptions").select("user_id").eq("endpoint", endpoint)).data).toEqual([
      { user_id: ID.users.anna },
    ]);

    expect((await bela.rpc("claim_push_notifications", { p_limit: 1 })).error).not.toBeNull();
    expect((await bela.rpc("set_app_config", { p_key: "dispatch_url", p_value: "https://gonosz.test" })).error).not.toBeNull();
  });
});
