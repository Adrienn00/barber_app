import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, PASSWORD, anonClient, serviceClient, userClient } from "./helpers";

const service = serviceClient();
const createdUsers: string[] = [];
const createdShops: string[] = [];
const stamp = Date.now().toString(36);

let admin: SupabaseClient;
let peti: SupabaseClient;
let laci: SupabaseClient;

/** Új felhasználó (még barberprofil nélkül) */
async function newUser(name: string) {
  const email = `${name}-${stamp}@barber.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name, phone: "+40745000111", terms_accepted: "true" },
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  return { id: data.user.id, email, db: await userClient(email) };
}

/** Barberprofil (függő jelentkezés) a felhasználó saját nevében */
async function applyAsBarber(user: { id: string; db: SupabaseClient }, slug: string) {
  const { data, error } = await user.db
    .from("barbers")
    .insert({
      user_id: user.id,
      slug: `${slug}-${stamp}`,
      display_name: slug,
      city: "Kolozsvár",
      address: "Fő utca 1.",
      phone: "+40745000111",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createShop(db: SupabaseClient, ownerBarberId: string, slug: string) {
  const res = await db
    .from("shops")
    .insert({
      owner_barber_id: ownerBarberId,
      slug: `${slug}-${stamp}`,
      name: `${slug} Barbershop`,
      city: "Kolozsvár",
      address: "Fő tér 1.",
      phone: "+40745000222",
    })
    .select("id, status")
    .single();
  if (res.data) createdShops.push(res.data.id);
  return res;
}

async function invite(db: SupabaseClient, shopId: string, email: string) {
  return db.from("shop_invites").insert({ shop_id: shopId, email }).select("id, token").single();
}

async function barberRow(barberId: string) {
  const { data } = await service.from("barbers").select("status, shop_id").eq("id", barberId).single();
  return data!;
}

let petiShopId: string;
let laciShopId: string;

beforeAll(async () => {
  [admin, peti, laci] = await Promise.all([
    userClient("admin@barber.test"),
    userClient("peti@barber.test"),
    userClient("laci@barber.test"),
  ]);
});

afterAll(async () => {
  if (createdShops.length) await service.from("shops").delete().in("id", createdShops);
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
});

describe("Egység létrehozása és jóváhagyása", () => {
  it("vendég és függő barber nem hozhat létre egységet", async () => {
    const anna = await userClient("anna@vendeg.test");
    expect((await createShop(anna, ID.barbers.peti, "anna")).error?.code).toBe("42501");
    const zoli = await userClient("zoli@barber.test");
    expect((await createShop(zoli, ID.barbers.zoli, "zoli")).error?.code).toBe("42501");
  });

  it("más barber nevében sem lehet egységet létrehozni", async () => {
    expect((await createShop(laci, ID.barbers.peti, "hamis")).error?.code).toBe("42501");
  });

  it("jóváhagyott barber létrehozza → függő, nyilvánosan nem látszik, meghívni még nem lehet", async () => {
    const res = await createShop(peti, ID.barbers.peti, "klasszik");
    expect(res.error).toBeNull();
    expect(res.data!.status).toBe("pending");
    petiShopId = res.data!.id;

    expect((await anonClient().from("shops").select("id").eq("id", petiShopId)).data).toEqual([]);
    expect((await invite(peti, petiShopId, "valaki@barber.test")).error?.code).toBe("42501");
    // A vezető nem hagyhatja jóvá saját magát
    expect((await peti.from("shops").update({ status: "approved" }).eq("id", petiShopId)).error?.code).toBe("42501");
  });

  it("az admin jóváhagyja → nyilvános lesz, a vezető a tagja", async () => {
    const res = await admin.rpc("admin_set_shop_status", { p_shop_id: petiShopId, p_status: "approved" });
    expect(res.error).toBeNull();
    expect((await anonClient().from("shops").select("id").eq("id", petiShopId)).data).toHaveLength(1);
    expect((await barberRow(ID.barbers.peti)).shop_id).toBe(petiShopId);

    const members = await anonClient().rpc("get_shop_members", { p_shop_id: petiShopId });
    expect(members.data).toEqual([expect.objectContaining({ barber_id: ID.barbers.peti, is_owner: true })]);
  });

  it("az admin a vezető nevével együtt látja az egységet (admin.queries.ts lekérdezése)", async () => {
    const { data, error } = await admin
      .from("shops")
      .select("id, name, status, owner:barbers!shops_owner_barber_id_fkey(display_name)")
      .eq("id", petiShopId)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: "approved", owner: { display_name: "Peti Barber" } });
  });

  it("a barber nem állíthatja át közvetlenül a tagságát", async () => {
    expect((await laci.from("barbers").update({ shop_id: petiShopId }).eq("id", ID.barbers.laci)).error?.code).toBe(
      "42501",
    );
  });
});

describe("Meghívás és csatlakozás", () => {
  let newbie: Awaited<ReturnType<typeof newUser>>;
  let newbieBarberId: string;
  let token: string;

  beforeAll(async () => {
    newbie = await newUser("ujonc");
    const inv = await invite(peti, petiShopId, newbie.email);
    expect(inv.error).toBeNull();
    token = inv.data!.token;
  });

  it("más barber nem látja az egység meghívóit", async () => {
    expect((await laci.from("shop_invites").select("id").eq("shop_id", petiShopId)).data).toEqual([]);
  });

  it("a meghívó oldal megmutatja az egységet és hogy kinek szól", async () => {
    const { data } = await newbie.db.rpc("get_shop_invite", { p_token: token });
    expect(data).toEqual([expect.objectContaining({ shop_name: "klasszik Barbershop", is_for_me: true, is_expired: false })]);
  });

  it("barberprofil nélkül nem lehet elfogadni", async () => {
    const res = await newbie.db.rpc("accept_shop_invite", { p_token: token });
    expect(res.error?.message).toContain("barberprofil");
  });

  it("más e-mail-című felhasználó nem fogadhatja el", async () => {
    const other = await newUser("masik");
    await applyAsBarber(other, "masik");
    const res = await other.db.rpc("accept_shop_invite", { p_token: token });
    expect(res.error?.code).toBe("42501");
  });

  it("elfogadás után tag lesz, és (függő jelentkezőként is) jóváhagyott barber", async () => {
    newbieBarberId = await applyAsBarber(newbie, "ujonc");
    expect((await barberRow(newbieBarberId)).status).toBe("pending");

    const res = await newbie.db.rpc("accept_shop_invite", { p_token: token });
    expect(res.error).toBeNull();
    expect(await barberRow(newbieBarberId)).toEqual({ status: "approved", shop_id: petiShopId });

    // Ugyanaz a meghívó másodszor már nem használható
    expect((await newbie.db.rpc("accept_shop_invite", { p_token: token })).error?.code).toBe("22023");
  });

  it("más egység meghívóját nem fogadhatja el, amíg tag", async () => {
    const shop = await createShop(laci, ID.barbers.laci, "laci-bolt");
    laciShopId = shop.data!.id;
    await admin.rpc("admin_set_shop_status", { p_shop_id: laciShopId, p_status: "approved" });
    const inv = await invite(laci, laciShopId, newbie.email);
    const res = await newbie.db.rpc("accept_shop_invite", { p_token: inv.data!.token });
    expect(res.error?.message).toContain("másik egység");
  });

  it("lejárt meghívó nem fogadható el; elutasítani lehet", async () => {
    const late = await newUser("keso");
    await applyAsBarber(late, "keso");
    const inv = await invite(peti, petiShopId, late.email);
    await service.from("shop_invites").update({ expires_at: "2020-01-01T00:00:00Z" }).eq("id", inv.data!.id);
    expect((await late.db.rpc("accept_shop_invite", { p_token: inv.data!.token })).error?.message).toContain("lejárt");

    const fresh = await invite(laci, laciShopId, late.email);
    expect((await late.db.rpc("decline_shop_invite", { p_token: fresh.data!.token })).error).toBeNull();
    const { data } = await service.from("shop_invites").select("status").eq("id", fresh.data!.id).single();
    expect(data!.status).toBe("declined");
  });

  it("a vezető csak olvasható áttekintést kap: foglalás névvel, magánprogram tartalom nélkül", async () => {
    // Az új tagnak egy foglalás és egy magánprogram
    const { data: svc } = await service
      .from("services")
      .insert({ barber_id: newbieBarberId, name: "Hajvágás", duration_min: 30, price: 50 })
      .select("id")
      .single();
    await service.from("bookings").insert({
      barber_id: newbieBarberId,
      service_id: svc!.id,
      guest_name: "Vendég Viktor",
      guest_phone: "+40755000999",
      starts_at: "2031-06-02T08:00:00Z",
      ends_at: "2031-06-02T08:30:00Z",
      block_end: "2031-06-02T08:30:00Z",
      status: "confirmed",
    });
    await service.from("private_events").insert({
      barber_id: newbieBarberId,
      title: "Titkos program",
      starts_at: "2031-06-02T10:00:00Z",
      ends_at: "2031-06-02T11:00:00Z",
    });

    const range = { p_from: "2031-06-01T00:00:00Z", p_to: "2031-06-03T00:00:00Z" };
    const { data } = await peti.rpc("get_shop_calendar", range);
    const rows = (data ?? []).filter((r: { barber_id: string }) => r.barber_id === newbieBarberId);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: "booking", customer_name: "Vendég Viktor", service_name: "Hajvágás" });
    expect(rows[1]).toMatchObject({ kind: "busy", service_name: null, customer_name: null });
    expect(JSON.stringify(data)).not.toContain("Titkos program");

    // A tag és más egység vezetője nem látja
    expect((await newbie.db.rpc("get_shop_calendar", range)).data).toEqual([]);
    const laciView = (await laci.rpc("get_shop_calendar", range)).data ?? [];
    expect(laciView.some((r: { barber_id: string }) => r.barber_id === newbieBarberId)).toBe(false);
  });

  it("más egység vezetője nem távolíthatja el a tagot; a saját vezetője igen", async () => {
    expect((await laci.rpc("remove_shop_member", { p_barber_id: newbieBarberId })).error?.code).toBe("22023");
    expect((await peti.rpc("remove_shop_member", { p_barber_id: ID.barbers.peti })).error?.message).toContain("vezetőt");
    expect((await peti.rpc("remove_shop_member", { p_barber_id: newbieBarberId })).error).toBeNull();
    expect((await barberRow(newbieBarberId)).shop_id).toBeNull();
  });

  it("kilépés: a tag újra önálló lesz; a vezető nem léphet ki", async () => {
    const again = await invite(peti, petiShopId, newbie.email);
    await newbie.db.rpc("accept_shop_invite", { p_token: again.data!.token });
    expect((await barberRow(newbieBarberId)).shop_id).toBe(petiShopId);

    expect((await newbie.db.rpc("leave_shop")).error).toBeNull();
    expect(await barberRow(newbieBarberId)).toEqual({ status: "approved", shop_id: null });
    expect((await peti.rpc("leave_shop")).error?.message).toContain("vezető");
  });
});
