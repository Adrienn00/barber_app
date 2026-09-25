import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bucharestToUtc } from "../../src/shared/datetime/datetime";
import { ID, anonClient, serviceClient, userClient } from "./helpers";

const service = serviceClient();
const createdEvents: string[] = [];
const createdBookings: string[] = [];

let peti: SupabaseClient;
let laci: SupabaseClient;
let anna: SupabaseClient;

beforeAll(async () => {
  [peti, laci, anna] = await Promise.all([
    userClient("peti@barber.test"),
    userClient("laci@barber.test"),
    userClient("anna@vendeg.test"),
  ]);
});

afterAll(async () => {
  if (createdBookings.length) await service.from("bookings").delete().in("id", createdBookings);
  if (createdEvents.length) await service.from("private_events").delete().in("id", createdEvents);
});

/** Bukaresti helyi idő → ISO (UTC) */
const local = (dateTime: string) => bucharestToUtc(dateTime).toISOString();
/** ISO → bukaresti "HH:mm" */
const localTime = (iso: string) =>
  new Intl.DateTimeFormat("hu-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

async function createEvent(db: SupabaseClient, fields: Record<string, unknown>) {
  const { data, error } = await db
    .from("private_events")
    .insert({ barber_id: ID.barbers.peti, ...fields })
    .select("id")
    .single();
  if (error) throw error;
  createdEvents.push(data.id);
  return data.id as string;
}

type Occurrence = { event_id: string; occurrence_date: string; starts_at: string; ends_at: string };

async function occurrences(db: SupabaseClient, from: string, to: string, eventId?: string) {
  const { data, error } = await db.rpc("get_my_private_event_occurrences", { p_from: from, p_to: to });
  if (error) throw error;
  return (data as Occurrence[]).filter((o) => !eventId || o.event_id === eventId);
}

describe("Heti ismétlődő magánprogram", () => {
  // 2030. március 31-én (vasárnap) van a tavaszi óraátállítás Romániában
  let eventId: string;
  beforeAll(async () => {
    eventId = await createEvent(peti, {
      title: "Ebéd",
      starts_at: local("2030-03-19T12:00"), // kedd
      ends_at: local("2030-03-19T13:00"),
      repeat: "weekly",
      repeat_until: "2030-04-16",
    });
  });

  it("minden kedden helyi idő szerint 12:00–13:00 – az óraátállítás után is", async () => {
    const list = await occurrences(peti, local("2030-03-18T00:00"), local("2030-05-01T00:00"), eventId);
    expect(list.map((o) => o.occurrence_date)).toEqual([
      "2030-03-19",
      "2030-03-26",
      "2030-04-02",
      "2030-04-09",
      "2030-04-16", // a záró dátum még benne van
    ]);
    for (const o of list) {
      expect(localTime(o.starts_at)).toBe("12:00");
      expect(localTime(o.ends_at)).toBe("13:00");
    }
    // UTC-ben viszont egy órát ugrik: télen 10:00Z, nyáron 09:00Z
    expect(list[1].starts_at).toBe("2030-03-26T10:00:00+00:00");
    expect(list[2].starts_at).toBe("2030-04-02T09:00:00+00:00");
  });

  it("egy kihagyott alkalom nem jelenik meg, a többi igen", async () => {
    const { error } = await peti.from("private_event_skips").insert({ event_id: eventId, occurrence_date: "2030-04-02" });
    expect(error).toBeNull();
    const list = await occurrences(peti, local("2030-03-18T00:00"), local("2030-05-01T00:00"), eventId);
    expect(list.map((o) => o.occurrence_date)).not.toContain("2030-04-02");
    expect(list).toHaveLength(4);
  });

  it("csak a kért időszak alkalmait adja vissza", async () => {
    const list = await occurrences(peti, local("2030-04-08T00:00"), local("2030-04-12T00:00"), eventId);
    expect(list.map((o) => o.occurrence_date)).toEqual(["2030-04-09"]);
  });
});

describe("Magánprogram-alkalmak láthatósága", () => {
  it("egyszeri és egész napos esemény is megjelenik", async () => {
    const id = await createEvent(peti, {
      title: "Szabadnap",
      starts_at: local("2030-06-10T00:00"),
      ends_at: local("2030-06-11T00:00"),
      all_day: true,
    });
    const list = await occurrences(peti, local("2030-06-10T08:00"), local("2030-06-10T09:00"), id);
    expect(list).toHaveLength(1);
    expect(list[0].occurrence_date).toBe("2030-06-10");
  });

  it("más barber és vendég nem látja Peti alkalmait", async () => {
    const from = local("2030-03-01T00:00");
    const to = local("2030-07-01T00:00");
    expect((await occurrences(laci, from, to)).some((o) => createdEvents.includes(o.event_id))).toBe(false);
    expect(await occurrences(anna, from, to)).toEqual([]);
    const anon = await anonClient().rpc("get_my_private_event_occurrences", { p_from: from, p_to: to });
    expect(anon.error).not.toBeNull();
  });
});

describe("Naptár-lekérdezés (a calendar.queries.ts-sel azonos)", () => {
  it("a barber a foglalásain látja a vendég nevét, telefonját és a szolgáltatást", async () => {
    const { data, error } = await peti
      .from("bookings")
      .select(
        `id, status, starts_at, ends_at, guest_name, guest_phone, customer_note,
         service:services(name, price),
         customer:profiles!bookings_customer_id_fkey(full_name, phone)`,
      )
      .eq("barber_id", ID.barbers.peti)
      .in("status", ["pending", "confirmed"]);
    expect(error).toBeNull();
    const withAccount = data!.find((b) => b.customer);
    expect(withAccount).toMatchObject({ customer: { full_name: "Tóth Anna" }, service: { name: expect.any(String) } });
    const guest = data!.find((b) => b.guest_name === "Kiss János");
    expect(guest).toMatchObject({ customer: null, guest_phone: "+40 755 000 111" });
  });

  it("a korábbi vendégek listája névvel jön (kézi foglaláshoz)", async () => {
    const { data } = await peti
      .from("barber_customers")
      .select("customer_id, customer:profiles!barber_customers_customer_id_fkey(full_name, phone)")
      .eq("barber_id", ID.barbers.peti);
    expect(data).toEqual([
      { customer_id: ID.users.anna, customer: { full_name: "Tóth Anna", phone: "+40 745 123 456" } },
    ]);
  });
});

describe("Ütközésjelzés magánprogram mentésekor", () => {
  it("jelzi, ha a magánprogram egy foglalásra esik; más barber nem kérdezheti le", async () => {
    // Peti seedelt, megerősített foglalása Annával (jövő hétfő 10:00)
    const { data: booking } = await service
      .from("bookings")
      .select("id, starts_at")
      .eq("barber_id", ID.barbers.peti)
      .eq("customer_id", ID.users.anna)
      .eq("status", "confirmed")
      .single();
    const eventId = await createEvent(peti, {
      title: "Orvos",
      starts_at: booking!.starts_at,
      ends_at: new Date(new Date(booking!.starts_at).getTime() + 60 * 60_000).toISOString(),
    });

    const own = await peti.rpc("get_private_event_conflicts", { p_event_id: eventId });
    expect(own.error).toBeNull();
    expect((own.data as { booking_id: string }[]).map((c) => c.booking_id)).toEqual([booking!.id]);

    const other = await laci.rpc("get_private_event_conflicts", { p_event_id: eventId });
    expect(other.data).toEqual([]);
  });
});

describe("Kézi foglalás (create_manual_booking)", () => {
  async function manual(db: SupabaseClient, args: Record<string, unknown>) {
    const res = await db.rpc("create_manual_booking", args);
    if (res.data) createdBookings.push(res.data as string);
    return res;
  }

  it("fiók nélküli vendégnek: megerősített, pufferrel számolt foglalás", async () => {
    const res = await manual(peti, {
      p_service_id: ID.services.petiHajvagas,
      p_starts_at: local("2031-02-03T10:00"),
      p_guest_name: "Telefonos Tibor",
      p_guest_phone: "+40 755 111 222",
    });
    expect(res.error).toBeNull();
    const { data } = await service.from("bookings").select("*").eq("id", res.data).single();
    expect(data).toMatchObject({ status: "confirmed", guest_name: "Telefonos Tibor", customer_id: null });
    expect(new Date(data!.ends_at).toISOString()).toBe(local("2031-02-03T10:30"));
    expect(new Date(data!.block_end).toISOString()).toBe(local("2031-02-03T10:35")); // Peti puffere 5 perc
  });

  it("munkaidőn kívülre is felvehető (vasárnap este)", async () => {
    const res = await manual(peti, {
      p_service_id: ID.services.petiHajvagas,
      p_starts_at: local("2031-02-09T21:00"),
      p_guest_name: "Késői Kálmán",
      p_guest_phone: "+40 755 333 444",
    });
    expect(res.error).toBeNull();
  });

  it("korábbi vendégnek fiókkal is felvehető", async () => {
    const res = await manual(peti, {
      p_service_id: ID.services.petiHajvagas,
      p_starts_at: local("2031-02-04T10:00"),
      p_customer_id: ID.users.anna,
    });
    expect(res.error).toBeNull();
  });

  it("ütközésnél (a puffert is beleértve) magyar hibaüzenettel elutasít", async () => {
    const res = await manual(peti, {
      p_service_id: ID.services.petiHajvagas,
      p_starts_at: local("2031-02-03T10:33"),
      p_guest_name: "Siető Sándor",
      p_guest_phone: "+40 755 555 666",
    });
    expect(res.error?.code).toBe("23P01");
    expect(res.error?.message).toContain("ütközik");
  });

  it("nem a saját vendége, nem a saját szolgáltatása, vagy hiányzó adat → hiba", async () => {
    // Béla sosem foglalt Petinél
    expect(
      (await manual(peti, { p_service_id: ID.services.petiHajvagas, p_starts_at: local("2031-02-05T10:00"), p_customer_id: ID.users.bela }))
        .error?.code,
    ).toBe("22023");
    // Laci szolgáltatása
    expect(
      (await manual(peti, { p_service_id: ID.services.laciHajvagas, p_starts_at: local("2031-02-05T10:00"), p_guest_name: "X", p_guest_phone: "+40755000000" }))
        .error?.code,
    ).toBe("22023");
    // Se vendég, se név
    expect((await manual(peti, { p_service_id: ID.services.petiHajvagas, p_starts_at: local("2031-02-05T10:00") })).error?.code).toBe(
      "22023",
    );
    // Inaktív szolgáltatás
    expect(
      (await manual(peti, { p_service_id: ID.services.petiInactive, p_starts_at: local("2031-02-05T10:00"), p_guest_name: "X", p_guest_phone: "+40755000000" }))
        .error?.code,
    ).toBe("22023");
  });

  it("vendég és függő barber nem vehet fel kézi foglalást", async () => {
    const zoli = await userClient("zoli@barber.test");
    const args = {
      p_service_id: ID.services.zoliHajvagas,
      p_starts_at: local("2031-02-06T10:00"),
      p_guest_name: "X",
      p_guest_phone: "+40755000000",
    };
    expect((await manual(zoli, args)).error?.code).toBe("42501");
    expect((await manual(anna, args)).error?.code).toBe("42501");
  });
});
