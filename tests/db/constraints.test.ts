import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ID, PASSWORD, serviceClient, userClient } from "./helpers";

let db: SupabaseClient;
const createdBookings: string[] = [];

beforeAll(() => {
  db = serviceClient();
});

afterEach(async () => {
  if (createdBookings.length) {
    await db.from("bookings").delete().in("id", createdBookings.splice(0));
  }
});

const addMinutes = (iso: string, min: number) => new Date(new Date(iso).getTime() + min * 60_000).toISOString();

async function insertBooking(fields: Record<string, unknown>) {
  const res = await db.from("bookings").insert(fields).select("id").single();
  if (res.data) createdBookings.push(res.data.id);
  return res;
}

/** Peti seedelt, megerősített 10:00-s foglalása Annával (30 perc + 5 perc puffer) */
async function petiMondayBooking() {
  const { data } = await db
    .from("bookings")
    .select("starts_at, ends_at, block_end")
    .eq("barber_id", ID.barbers.peti)
    .eq("customer_id", ID.users.anna)
    .eq("status", "confirmed")
    .single();
  return data!;
}

function guestBooking(barberId: string, serviceId: string, startsAt: string, minutes: number, bufferMin: number, status = "confirmed") {
  const endsAt = addMinutes(startsAt, minutes);
  return {
    barber_id: barberId,
    service_id: serviceId,
    guest_name: "Teszt Vendég",
    guest_phone: "+40 700 111 222",
    starts_at: startsAt,
    ends_at: endsAt,
    block_end: addMinutes(endsAt, bufferMin),
    status,
    cancelled_by: status === "cancelled" ? "barber" : null,
    expires_at: status === "pending" ? addMinutes(startsAt, -60) : null,
  };
}

describe("Dupla foglalás kizárása (no_overlap)", () => {
  it("azonos időre nem lehet még egy foglalás", async () => {
    const b = await petiMondayBooking();
    const res = await insertBooking(guestBooking(ID.barbers.peti, ID.services.petiHajvagas, b.starts_at, 30, 5));
    expect(res.error?.code).toBe("23P01");
  });

  it("a pufferidőbe sem lehet foglalni", async () => {
    const b = await petiMondayBooking();
    // 10:30-kor ér véget, 10:35-ig puffer → 10:32 tilos
    const res = await insertBooking(guestBooking(ID.barbers.peti, ID.services.petiHajvagas, addMinutes(b.ends_at, 2), 20, 5));
    expect(res.error?.code).toBe("23P01");
  });

  it("a puffer végén már lehet foglalni", async () => {
    const b = await petiMondayBooking();
    const res = await insertBooking(guestBooking(ID.barbers.peti, ID.services.petiHajvagas, b.block_end, 20, 0));
    expect(res.error).toBeNull();
  });

  it("függő kérés is foglalja az időt", async () => {
    const start = "2031-03-03T08:00:00Z";
    const first = await insertBooking(guestBooking(ID.barbers.peti, ID.services.petiHajvagas, start, 30, 0, "pending"));
    expect(first.error).toBeNull();
    const second = await insertBooking(guestBooking(ID.barbers.peti, ID.services.petiHajvagas, addMinutes(start, 15), 30, 0));
    expect(second.error?.code).toBe("23P01");
  });

  it("lemondott foglalás nem foglalja az időt", async () => {
    const b = await petiMondayBooking();
    const res = await insertBooking(guestBooking(ID.barbers.peti, ID.services.petiHajvagas, b.starts_at, 30, 5, "cancelled"));
    expect(res.error).toBeNull();
  });

  it("másik barbernél ugyanarra az időre lehet foglalni", async () => {
    const b = await petiMondayBooking();
    const res = await insertBooking(guestBooking(ID.barbers.laci, ID.services.laciHajvagas, b.starts_at, 40, 0));
    expect(res.error).toBeNull();
  });
});

describe("Egyéb adatbázis-szabályok", () => {
  it("foglaláshoz kell vendégfiók vagy név + telefon", async () => {
    const res = await insertBooking({
      ...guestBooking(ID.barbers.peti, ID.services.petiHajvagas, "2031-01-06T08:00:00Z", 30, 0),
      guest_name: null,
      guest_phone: null,
    });
    expect(res.error?.code).toBe("23514");
  });

  it("a munkaidő-sávok egy napon belül nem fedhetik egymást", async () => {
    // Peti hétfőn 9–13 dolgozik
    const res = await db
      .from("working_hours")
      .insert({ barber_id: ID.barbers.peti, weekday: 1, start_time: "12:00", end_time: "15:00" });
    expect(res.error?.code).toBe("23P01");
  });

  it("foglalt szó nem lehet slug", async () => {
    const res = await db.from("barbers").update({ slug: "admin" }).eq("id", ID.barbers.zoli);
    expect(res.error?.code).toBe("23514");
  });

  it("új barbernek automatikusan létrejönnek az alapbeállításai", async () => {
    const { data } = await db.from("barber_settings").select("*").eq("barber_id", ID.barbers.zoli).single();
    expect(data).toMatchObject({ approval_timeout_min: 120, cancel_limit_hours: 24, slot_step_min: 15 });
  });
});

describe("Regisztráció és fióktörlés (GDPR)", () => {
  it("regisztrációkor profil jön létre; törléskor a foglalások anonimizálódnak, a jövőbeliek lemondódnak", async () => {
    const email = `torlendo-${Date.now()}@vendeg.test`;
    const created = await db.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Törlendő Tamás" },
    });
    expect(created.error).toBeNull();
    const userId = created.data.user!.id;

    // A trigger létrehozta a profilt a névvel
    const client = await userClient(email);
    const profile = await client.from("profiles").select("full_name, is_admin").single();
    expect(profile.data).toEqual({ full_name: "Törlendő Tamás", is_admin: false });

    const past = await insertBooking({
      ...guestBooking(ID.barbers.peti, ID.services.petiHajvagas, "2020-01-06T08:00:00Z", 30, 0),
      guest_name: null,
      guest_phone: null,
      customer_id: userId,
      customer_note: "személyes megjegyzés",
    });
    const future = await insertBooking({
      ...guestBooking(ID.barbers.peti, ID.services.petiHajvagas, "2031-01-06T10:00:00Z", 30, 0, "pending"),
      guest_name: null,
      guest_phone: null,
      customer_id: userId,
    });
    expect(past.error).toBeNull();
    expect(future.error).toBeNull();

    const deleted = await db.auth.admin.deleteUser(userId);
    expect(deleted.error).toBeNull();

    const { data } = await db
      .from("bookings")
      .select("id, customer_id, is_anonymized, customer_note, status, cancelled_by")
      .in("id", [past.data!.id, future.data!.id]);
    const byId = Object.fromEntries(data!.map((b) => [b.id, b]));

    expect(byId[past.data!.id]).toMatchObject({
      customer_id: null,
      is_anonymized: true,
      customer_note: null,
      status: "confirmed",
    });
    expect(byId[future.data!.id]).toMatchObject({
      customer_id: null,
      is_anonymized: true,
      status: "cancelled",
      cancelled_by: "customer",
    });
  });
});
