import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, PASSWORD, anonClient, serviceClient, userClient } from "./helpers";

const service = serviceClient();
const createdUsers: string[] = [];

/** Új felhasználó, aki barbernek jelentkezik (saját néven, a valódi RLS-en át) */
async function newApplicant(slug: string) {
  const email = `${slug}-${Date.now()}@barber.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Teszt Jelentkező", phone: "+40745000999", terms_accepted: "true" },
  });
  if (error) throw error;
  createdUsers.push(data.user.id);

  const db = await userClient(email);
  const { data: barber, error: insertError } = await db
    .from("barbers")
    .insert({
      user_id: data.user.id,
      slug: `${slug}-${Date.now().toString(36)}`,
      display_name: "Teszt Barber",
      city: "Kolozsvár",
      address: "Teszt utca 1.",
      phone: "+40745000999",
    })
    .select("id, status")
    .single();
  if (insertError) throw insertError;
  return { userId: data.user.id, barberId: barber.id as string, status: barber.status as string, db };
}

let admin: SupabaseClient;

beforeAll(async () => {
  admin = await userClient("admin@barber.test");
});

afterAll(async () => {
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
});

describe("Regisztráció", () => {
  it("a regisztrációkor elfogadott feltételek és a telefon bekerülnek a profilba", async () => {
    const { userId, db } = await newApplicant("reg");
    const { data } = await db.from("profiles").select("phone, terms_accepted_at").eq("id", userId).single();
    expect(data!.phone).toBe("+40745000999");
    expect(data!.terms_accepted_at).not.toBeNull();
  });
});

describe("Barberjelentkezés és admin döntés", () => {
  it("az új jelentkezés függő, nyilvánosan nem látszik", async () => {
    const { barberId, status } = await newApplicant("uj");
    expect(status).toBe("pending");
    const { data } = await anonClient().from("barbers").select("id").eq("id", barberId);
    expect(data).toEqual([]);
  });

  it("vendég és barber nem hívhatja az admin függvényeket", async () => {
    const { barberId } = await newApplicant("jogos");
    for (const email of ["anna@vendeg.test", "peti@barber.test"]) {
      const db = await userClient(email);
      const res = await db.rpc("admin_set_barber_status", { p_barber_id: barberId, p_status: "approved" });
      expect(res.error?.code).toBe("42501");
      expect((await db.rpc("admin_stats")).error?.code).toBe("42501");
    }
  });

  it("az admin jóváhagyja → nyilvános lesz, jóváhagyás dátummal", async () => {
    const { barberId } = await newApplicant("jovahagy");
    const res = await admin.rpc("admin_set_barber_status", { p_barber_id: barberId, p_status: "approved" });
    expect(res.error).toBeNull();

    const { data } = await anonClient().from("barbers").select("id").eq("id", barberId);
    expect(data).toHaveLength(1);
    const { data: row } = await service.from("barbers").select("status, approved_at").eq("id", barberId).single();
    expect(row!.status).toBe("approved");
    expect(row!.approved_at).not.toBeNull();
  });

  it("elutasítás csak indoklással; utána a jelentkező javítva újraküldheti", async () => {
    const { barberId, db } = await newApplicant("elutasit");

    const noReason = await admin.rpc("admin_set_barber_status", { p_barber_id: barberId, p_status: "rejected" });
    expect(noReason.error?.code).toBe("22023");

    const rejected = await admin.rpc("admin_set_barber_status", {
      p_barber_id: barberId,
      p_status: "rejected",
      p_reason: "Hiányzik a pontos cím.",
    });
    expect(rejected.error).toBeNull();

    // A jelentkező látja az indoklást, javít, újraküld
    const { data: own } = await db.from("barbers").select("status, reject_reason").eq("id", barberId).single();
    expect(own).toEqual({ status: "rejected", reject_reason: "Hiányzik a pontos cím." });
    await db.from("barbers").update({ address: "Teszt utca 1., 2. emelet" }).eq("id", barberId);
    expect((await db.rpc("reapply_as_barber")).error).toBeNull();

    const { data: after } = await db.from("barbers").select("status, reject_reason").eq("id", barberId).single();
    expect(after).toEqual({ status: "pending", reject_reason: null });
  });

  it("érvénytelen státuszváltást elutasít (pl. jóváhagyottból elutasított)", async () => {
    const res = await admin.rpc("admin_set_barber_status", {
      p_barber_id: ID.barbers.laci,
      p_status: "rejected",
      p_reason: "x",
    });
    expect(res.error?.code).toBe("22023");
  });

  it("felfüggesztés lemondja a jövőbeli foglalásokat; visszaállítás után újra nyilvános", async () => {
    const { barberId } = await newApplicant("felfugg");
    await admin.rpc("admin_set_barber_status", { p_barber_id: barberId, p_status: "approved" });

    const { data: svc } = await service
      .from("services")
      .insert({ barber_id: barberId, name: "Hajvágás", duration_min: 30, price: 50 })
      .select("id")
      .single();
    const { data: booking } = await service
      .from("bookings")
      .insert({
        barber_id: barberId,
        service_id: svc!.id,
        customer_id: ID.users.bela,
        starts_at: "2031-05-05T08:00:00Z",
        ends_at: "2031-05-05T08:30:00Z",
        block_end: "2031-05-05T08:30:00Z",
        status: "confirmed",
      })
      .select("id")
      .single();

    const suspended = await admin.rpc("admin_set_barber_status", {
      p_barber_id: barberId,
      p_status: "suspended",
      p_reason: "Panasz érkezett.",
    });
    expect(suspended.error).toBeNull();

    const { data: cancelled } = await service
      .from("bookings")
      .select("status, cancelled_by")
      .eq("id", booking!.id)
      .single();
    expect(cancelled).toEqual({ status: "cancelled", cancelled_by: "barber" });
    expect((await anonClient().from("barbers").select("id").eq("id", barberId)).data).toEqual([]);

    await admin.rpc("admin_set_barber_status", { p_barber_id: barberId, p_status: "approved" });
    expect((await anonClient().from("barbers").select("id").eq("id", barberId)).data).toHaveLength(1);
  });

  it("az admin statisztika számokat ad vissza", async () => {
    const { data, error } = await admin.rpc("admin_stats");
    expect(error).toBeNull();
    expect(data).toMatchObject({ barbers_approved: expect.any(Number), customers: expect.any(Number) });
  });
});
