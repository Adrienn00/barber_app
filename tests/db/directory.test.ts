import { afterAll, describe, expect, it } from "vitest";
import { ID, anonClient, serviceClient, userClient } from "./helpers";

const service = serviceClient();
let shopId: string | null = null;

afterAll(async () => {
  if (shopId) await service.from("shops").delete().eq("id", shopId); // a tag shop_id-ja null lesz
});

// Csak a tesztadatokat nézzük – a fejlesztő saját, kézzel felvett barberei ne zavarják a teszteket
const KNOWN = new Set(["kovacs-peter", "nagy-laci", "szabo-zoli", "teszt-egyseg"]);

async function directory(search?: string) {
  const { data, error } = await anonClient().rpc("list_directory", { p_search: search });
  if (error) throw error;
  return (data as { kind: string; slug: string; name: string }[])
    .filter((r) => KNOWN.has(r.slug))
    .map((r) => `${r.kind}:${r.slug}`);
}

describe("Barberlista (list_directory)", () => {
  it("csak a foglalható, jóváhagyott barberek; a függő jelentkező nem", async () => {
    expect(await directory()).toEqual(["barber:kovacs-peter", "barber:nagy-laci"]);
  });

  it("keresés név és város szerint, ékezettől függetlenül", async () => {
    expect(await directory("kolozsvar")).toEqual(["barber:kovacs-peter"]);
    expect(await directory("MAROSVÁSÁRHELY")).toEqual(["barber:nagy-laci"]);
    expect(await directory("borbely")).toEqual(["barber:nagy-laci"]);
    expect(await directory("nincs ilyen")).toEqual([]);
  });

  it("a nem listázott barber nem jelenik meg (de az oldala él)", async () => {
    await service.from("barbers").update({ is_listed: false }).eq("id", ID.barbers.laci);
    expect(await directory()).toEqual(["barber:kovacs-peter"]);
    const page = await anonClient().from("barbers").select("slug").eq("slug", "nagy-laci");
    expect(page.data).toHaveLength(1);
    await service.from("barbers").update({ is_listed: true }).eq("id", ID.barbers.laci);
  });

  it("egységtag önállóként eltűnik, helyette az egység látszik", async () => {
    const { data } = await service
      .from("shops")
      .insert({
        owner_barber_id: ID.barbers.peti,
        slug: "teszt-egyseg",
        name: "Teszt Egység",
        city: "Kolozsvár",
        address: "Fő tér 1.",
        phone: "+40745000222",
        status: "approved",
      })
      .select("id")
      .single();
    shopId = data!.id;
    await service.from("barbers").update({ shop_id: shopId }).eq("id", ID.barbers.peti);

    expect(await directory()).toEqual(["shop:teszt-egyseg", "barber:nagy-laci"]);
  });
});

describe("Foglalásaim (get_my_bookings)", () => {
  it("a vendég csak a saját foglalásait kapja, szolgáltatás- és barberadatokkal", async () => {
    const anna = await userClient("anna@vendeg.test");
    const { data, error } = await anna.rpc("get_my_bookings");
    expect(error).toBeNull();
    expect(data!.length).toBe(3); // seed: Petinél 2, Lacinál 1
    expect(data![0]).toMatchObject({
      service_id: expect.any(String), // az újrafoglaláshoz
      service_name: expect.any(String),
      barber_name: expect.any(String),
    });

    const bela = await userClient("bela@vendeg.test");
    const belas = (await bela.rpc("get_my_bookings")).data!;
    expect(belas.every((b: { barber_slug: string }) => b.barber_slug === "nagy-laci")).toBe(true);

    expect((await anonClient().rpc("get_my_bookings")).error).not.toBeNull();
  });
});
