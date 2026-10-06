import { afterAll, describe, expect, it } from "vitest";
import { ID, PASSWORD, anonClient, serviceClient, userClient } from "./helpers";

// Fiók törlése: jövőbeli foglalások lemondása (a másik fél értesítést kap), múltbeliek anonimizálása,
// majd a bejelentkezési fiók törlése kaszkádban. Admin és látogató nem hívhatja.
const service = serviceClient();
const createdUsers: string[] = [];
const createdBookings: string[] = [];
const startedAt = new Date().toISOString();

async function newUser(prefix: string) {
  const email = `${prefix}-${Date.now()}@torles.test`;
  const { data, error } = await service.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: "Törlendő Tamás", phone: "+40745000555", terms_accepted: "true" },
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  return { id: data.user.id, db: await userClient(email) };
}

async function booking(barberId: string, serviceId: string, customerId: string, startsAt: Date, note: string | null = null) {
  const end = new Date(startsAt.getTime() + 30 * 60_000).toISOString();
  const { data, error } = await service
    .from("bookings")
    .insert({
      barber_id: barberId, customer_id: customerId, service_id: serviceId, starts_at: startsAt.toISOString(),
      ends_at: end, block_end: end, status: "confirmed", decided_at: startedAt, customer_note: note,
    })
    .select("id")
    .single();
  if (error) throw error;
  createdBookings.push(data.id);
  return data.id as string;
}

afterAll(async () => {
  if (createdBookings.length) await service.from("bookings").delete().in("id", createdBookings);
  for (const id of createdUsers) await service.auth.admin.deleteUser(id).catch(() => {});
  await service.from("notifications").delete().gte("created_at", startedAt).in("user_id", [ID.users.peti, ID.users.anna]);
});

describe("Fiók törlése", () => {
  it("vendég: a jövőbeli foglalás lemondódik (a barber értesítést kap), a múltbeli anonim marad", async () => {
    const tamas = await newUser("vendeg");
    const future = await booking(ID.barbers.peti, ID.services.petiHajvagas, tamas.id, new Date("2033-05-02T08:00:00Z"));
    const past = await booking(ID.barbers.peti, ID.services.petiHajvagas, tamas.id, new Date("2026-01-05T08:00:00Z"), "titkos megjegyzés");

    expect((await tamas.db.rpc("prepare_account_deletion")).error).toBeNull();
    const { data: f } = await service.from("bookings").select("status, cancelled_by").eq("id", future).single();
    expect(f).toEqual({ status: "cancelled", cancelled_by: "customer" });
    const { data: note } = await service
      .from("notifications").select("type").eq("user_id", ID.users.peti).eq("type", "booking_cancelled_by_customer").gte("created_at", startedAt);
    expect(note!.length).toBeGreaterThan(0);

    // A bejelentkezési fiók törlése (a szerver végzi) – a múltbeli foglalás anonim módon megmarad
    expect((await service.auth.admin.deleteUser(tamas.id)).error).toBeNull();
    const { data: p } = await service.from("bookings").select("customer_id, is_anonymized, customer_note").eq("id", past).single();
    expect(p).toEqual({ customer_id: null, is_anonymized: true, customer_note: null });
    expect((await service.from("profiles").select("id").eq("id", tamas.id)).data).toHaveLength(0);
    expect((await service.from("barber_customers").select("barber_id").eq("customer_id", tamas.id)).data).toHaveLength(0);
  });

  it("barber: a jövőbeli foglalásai lemondódnak, a vendég értesítést kap; a barberprofil törlődik", async () => {
    const barber = await newUser("barber");
    const { data: b } = await service
      .from("barbers")
      .insert({
        user_id: barber.id, slug: `torlendo-${Date.now().toString(36)}`, display_name: "Törlendő Barber",
        city: "Arad", address: "Fő utca 1.", phone: "+40745000555", status: "approved",
      })
      .select("id")
      .single();
    const { data: s } = await service
      .from("services").insert({ barber_id: b!.id, name: "Vágás", duration_min: 30, price: 50 }).select("id").single();
    const id = await booking(b!.id, s!.id, ID.users.anna, new Date("2033-05-03T08:00:00Z"));

    expect((await barber.db.rpc("prepare_account_deletion")).error).toBeNull();
    const { data: f } = await service.from("bookings").select("status, cancelled_by, decision_note").eq("id", id).single();
    expect(f).toEqual({ status: "cancelled", cancelled_by: "barber", decision_note: "A barber megszüntette a fiókját." });
    const { data: notes } = await service
      .from("notifications").select("title").eq("user_id", ID.users.anna).eq("type", "booking_cancelled").gte("created_at", startedAt);
    expect(notes!.some((n) => n.title === "Törlendő Barber lemondta a foglalásod")).toBe(true);

    expect((await service.auth.admin.deleteUser(barber.id)).error).toBeNull();
    expect((await service.from("barbers").select("id").eq("id", b!.id)).data).toHaveLength(0);
  });

  it("admin és látogató nem hívhatja", async () => {
    const admin = await userClient("admin@barber.test");
    expect((await admin.rpc("prepare_account_deletion")).error?.code).toBe("22023");
    expect((await anonClient().rpc("prepare_account_deletion")).error).not.toBeNull();
  });
});
