import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { ID, anonClient, serviceClient, userClient } from "./helpers";

/** Nem látható = vagy üres a lista, vagy eleve jogosultsági hiba. */
function expectHidden(result: { data: unknown[] | null; error: unknown }) {
  expect(result.data ?? []).toEqual([]);
}

function expectDenied(result: { error: { code?: string } | null }) {
  expect(result.error).not.toBeNull();
  expect(result.error?.code).toBe("42501");
}

const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id).sort();
// Csak a teszt-barberek (a fejlesztő saját, kézzel felvett barberei ne zavarják a teszteket)
const SEED_BARBERS = new Set<string>(Object.values(ID.barbers));
const seedIds = (rows: { id: string }[] | null) => ids(rows).filter((id) => SEED_BARBERS.has(id));

describe("Látogató (nincs bejelentkezve)", () => {
  let db: SupabaseClient;
  beforeAll(() => {
    db = anonClient();
  });

  it("csak a jóváhagyott barbereket látja", async () => {
    const { data } = await db.from("barbers").select("id");
    expect(seedIds(data)).toEqual([ID.barbers.peti, ID.barbers.laci].sort());
  });

  it("csak jóváhagyott barber aktív szolgáltatásait látja", async () => {
    const { data } = await db.from("services").select("id, barber_id, is_active");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((s) => s.is_active)).toBe(true);
    expect(data!.some((s) => s.barber_id === ID.barbers.zoli)).toBe(false);
  });

  it("nem lát magánprogramot, foglalást, profilt, beállítást", async () => {
    for (const table of ["private_events", "private_event_skips", "bookings", "profiles", "barber_settings", "barber_customers", "notifications"]) {
      expectHidden(await db.from(table).select("*"));
    }
  });

  it("nem tud foglalást vagy barbert létrehozni", async () => {
    expectDenied(
      await db.from("bookings").insert({
        barber_id: ID.barbers.peti,
        service_id: ID.services.petiHajvagas,
        guest_name: "Hekker",
        guest_phone: "+40 700 000 000",
        starts_at: "2030-01-01T10:00:00Z",
        ends_at: "2030-01-01T10:30:00Z",
        block_end: "2030-01-01T10:30:00Z",
        status: "confirmed",
      }),
    );
  });
});

describe("Vendég (Anna)", () => {
  let db: SupabaseClient;
  beforeAll(async () => {
    db = await userClient("anna@vendeg.test");
  });

  it("nem lát semmilyen magánprogramot", async () => {
    expectHidden(await db.from("private_events").select("*"));
    expectHidden(await db.from("private_event_skips").select("*"));
  });

  it("csak a saját foglalásait látja (mindkét barbernél)", async () => {
    const { data } = await db.from("bookings").select("customer_id, barber_id");
    expect(data).toHaveLength(3);
    expect(data!.every((b) => b.customer_id === ID.users.anna)).toBe(true);
  });

  it("csak a saját profilját látja", async () => {
    const { data } = await db.from("profiles").select("id");
    expect(ids(data)).toEqual([ID.users.anna]);
  });

  it("nem lát barberbeállítást és vendéglistát", async () => {
    expectHidden(await db.from("barber_settings").select("*"));
    expectHidden(await db.from("barber_customers").select("*"));
  });

  it("nem tud közvetlenül foglalást beszúrni", async () => {
    expectDenied(
      await db.from("bookings").insert({
        barber_id: ID.barbers.peti,
        customer_id: ID.users.anna,
        service_id: ID.services.petiHajvagas,
        starts_at: "2030-01-01T10:00:00Z",
        ends_at: "2030-01-01T10:30:00Z",
        block_end: "2030-01-01T10:30:00Z",
        status: "confirmed",
      }),
    );
  });

  it("nem teheti magát adminná", async () => {
    expectDenied(await db.from("profiles").update({ is_admin: true }).eq("id", ID.users.anna));
  });

  it("a saját nevét módosíthatja, másét nem", async () => {
    const own = await db.from("profiles").update({ full_name: "Tóth Anna Mária" }).eq("id", ID.users.anna).select();
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);
    await db.from("profiles").update({ full_name: "Tóth Anna" }).eq("id", ID.users.anna);

    const other = await db.from("profiles").update({ full_name: "Feltört" }).eq("id", ID.users.bela).select();
    expect(other.data ?? []).toHaveLength(0);
  });

  it("nem jelentkezhet barbernek más nevében, és nem hagyhatja jóvá magát", async () => {
    const base = { slug: "anna-cuts", display_name: "Anna", city: "Kolozsvár", address: "Fő utca 1.", phone: "+40 745 123 456" };
    expectDenied(await db.from("barbers").insert({ ...base, user_id: ID.users.bela }));
    expectDenied(await db.from("barbers").insert({ ...base, user_id: ID.users.anna, status: "approved" }));
  });
});

describe("Barber (Peti)", () => {
  let db: SupabaseClient;
  beforeAll(async () => {
    db = await userClient("peti@barber.test");
  });

  it("csak a saját magánprogramjait látja", async () => {
    const { data } = await db.from("private_events").select("barber_id");
    expect(data).toHaveLength(2);
    expect(data!.every((e) => e.barber_id === ID.barbers.peti)).toBe(true);
    expectHidden(await db.from("private_events").select("*").eq("barber_id", ID.barbers.laci));
  });

  it("nem vehet fel magánprogramot más barbernek", async () => {
    const res = await db.from("private_events").insert({
      barber_id: ID.barbers.laci,
      title: "Betolakodó",
      starts_at: "2030-01-01T10:00:00Z",
      ends_at: "2030-01-01T11:00:00Z",
    });
    expectDenied(res);
  });

  it("saját magánprogramot felvehet és törölhet", async () => {
    const created = await db
      .from("private_events")
      .insert({ barber_id: ID.barbers.peti, title: "Teszt", starts_at: "2030-01-01T10:00:00Z", ends_at: "2030-01-01T11:00:00Z" })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const removed = await db.from("private_events").delete().eq("id", created.data!.id).select();
    expect(removed.data).toHaveLength(1);
  });

  it("csak a nála lévő foglalásokat látja", async () => {
    const { data } = await db.from("bookings").select("barber_id");
    expect(data).toHaveLength(3);
    expect(data!.every((b) => b.barber_id === ID.barbers.peti)).toBe(true);
  });

  it("a saját vendégei profilját látja, más barber vendégét nem", async () => {
    const { data } = await db.from("profiles").select("id");
    expect(ids(data)).toEqual([ID.users.peti, ID.users.anna].sort());
  });

  it("nem módosíthatja a saját státuszát", async () => {
    expectDenied(await db.from("barbers").update({ status: "approved" }).eq("id", ID.barbers.peti));
  });

  it("a saját nyilvános profilját módosíthatja", async () => {
    const res = await db.from("barbers").update({ bio: "Frissített bemutatkozás" }).eq("id", ID.barbers.peti).select();
    expect(res.data).toHaveLength(1);
  });

  it("nem módosíthatja más barber szolgáltatását, munkaidejét, beállítását", async () => {
    const svc = await db.from("services").update({ price: 1 }).eq("id", ID.services.laciHajvagas).select();
    expect(svc.data ?? []).toHaveLength(0);
    const { data: unchanged } = await serviceClient().from("services").select("price").eq("id", ID.services.laciHajvagas).single();
    expect(Number(unchanged!.price)).toBe(70);

    expectDenied(
      await db.from("working_hours").insert({ barber_id: ID.barbers.laci, weekday: 0, start_time: "10:00", end_time: "12:00" }),
    );

    const settings = await db.from("barber_settings").update({ buffer_min: 60 }).eq("barber_id", ID.barbers.laci).select();
    expect(settings.data ?? []).toHaveLength(0);
  });

  it("csak a saját beállításait és vendéglistáját látja", async () => {
    const settings = await db.from("barber_settings").select("barber_id");
    expect(settings.data!.map((s) => s.barber_id)).toEqual([ID.barbers.peti]);

    const customers = await db.from("barber_customers").select("barber_id, customer_id");
    expect(customers.data).toEqual([{ barber_id: ID.barbers.peti, customer_id: ID.users.anna }]);
  });

  it("megbízhatónak jelölheti a saját vendégét", async () => {
    const res = await db
      .from("barber_customers")
      .update({ is_trusted: true })
      .eq("barber_id", ID.barbers.peti)
      .eq("customer_id", ID.users.anna)
      .select();
    expect(res.data).toHaveLength(1);
    await db.from("barber_customers").update({ is_trusted: false }).eq("customer_id", ID.users.anna);
  });
});

describe("Függő barber (Zoli)", () => {
  it("a saját (még nem jóváhagyott) profilját és szolgáltatásait látja", async () => {
    const db = await userClient("zoli@barber.test");
    const barber = await db.from("barbers").select("id, status").eq("id", ID.barbers.zoli).single();
    expect(barber.data).toEqual({ id: ID.barbers.zoli, status: "pending" });
    const services = await db.from("services").select("id").eq("barber_id", ID.barbers.zoli);
    expect(ids(services.data)).toEqual([ID.services.zoliHajvagas]);
  });
});

describe("Platform admin", () => {
  let db: SupabaseClient;
  beforeAll(async () => {
    db = await userClient("admin@barber.test");
  });

  it("minden barbert lát, a függőt is", async () => {
    const { data } = await db.from("barbers").select("id");
    expect(seedIds(data)).toEqual([ID.barbers.peti, ID.barbers.laci, ID.barbers.zoli].sort());
  });

  it("nem lát magánprogramot, foglalást, vendégprofilt", async () => {
    expectHidden(await db.from("private_events").select("*"));
    expectHidden(await db.from("bookings").select("*"));
    const { data } = await db.from("profiles").select("id");
    expect(ids(data)).toEqual([ID.users.admin]);
  });

  it("appon keresztül sem módosíthatja közvetlenül a barber státuszát", async () => {
    expectDenied(await db.from("barbers").update({ status: "approved" }).eq("id", ID.barbers.zoli));
  });
});

describe("Élesítés előtti szigorítás", () => {
  it("látogató nem látja a belső azonosítót és az admin indoklását; a nyilvános adatokat igen", async () => {
    const anon = anonClient();
    expect((await anon.from("barbers").select("user_id").limit(1)).error).not.toBeNull();
    expect((await anon.from("barbers").select("reject_reason").limit(1)).error).not.toBeNull();
    expect((await anon.from("shops").select("owner_barber_id").limit(1)).error).not.toBeNull();
    const { data, error } = await anon.from("barbers").select("slug, display_name, city").eq("id", ID.barbers.peti);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("visszaállításkor a felfüggesztés oka törlődik (bejelentkezve sem olvasható ki)", async () => {
    // Ideiglenes barber, hogy a párhuzamos tesztek seed-barbereit ne zavarjuk
    const service = serviceClient();
    const { data: u } = await service.auth.admin.createUser({
      email: `indok-${Date.now()}@teszt.test`, password: "Jelszo123!", email_confirm: true,
      user_metadata: { full_name: "Indok Ida", phone: "+40745000444", terms_accepted: "true" },
    });
    try {
      const { data: b } = await service
        .from("barbers")
        .insert({
          user_id: u.user!.id, slug: `indok-${Date.now().toString(36)}`, display_name: "Indok Barber",
          city: "Arad", address: "Fő utca 3.", phone: "+40745000444", status: "approved",
        })
        .select("id")
        .single();
      await service.from("barbers").update({ status: "suspended", reject_reason: "Belső megjegyzés" }).eq("id", b!.id);
      await service.from("barbers").update({ status: "approved" }).eq("id", b!.id);
      const { data } = await service.from("barbers").select("status, reject_reason").eq("id", b!.id).single();
      expect(data).toEqual({ status: "approved", reject_reason: null });
    } finally {
      await service.auth.admin.deleteUser(u.user!.id);
    }
  });
});
