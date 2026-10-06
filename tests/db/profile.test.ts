import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, anonClient, serviceClient, userClient } from "./helpers";

// 7. fázis: profilkép (csak a saját mappába), avatar_path csak a sajátra, megbízható vendég jelölése.
const service = serviceClient();
const uploaded: string[] = [];

// 1×1 pixeles PNG
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);

let peti: SupabaseClient;
let laci: SupabaseClient;
let anna: SupabaseClient;

async function upload(db: SupabaseClient, path: string) {
  const res = await db.storage.from("avatars").upload(path, PNG, { contentType: "image/png" });
  if (!res.error) uploaded.push(path);
  return res;
}

beforeAll(async () => {
  [peti, laci, anna] = await Promise.all([
    userClient("peti@barber.test"),
    userClient("laci@barber.test"),
    userClient("anna@vendeg.test"),
  ]);
});

afterAll(async () => {
  await service.from("barbers").update({ avatar_path: null }).eq("id", ID.barbers.peti);
  if (uploaded.length) await service.storage.from("avatars").remove(uploaded);
  await service.from("barber_customers").update({ is_trusted: false }).eq("barber_id", ID.barbers.peti);
});

describe("Profilkép", () => {
  it("a barber csak a saját mappájába tölthet fel; más barber, vendég, látogató nem", async () => {
    const own = `barbers/${ID.barbers.peti}/teszt-${Date.now()}.png`;
    expect((await upload(peti, own)).error).toBeNull();

    expect((await upload(laci, `barbers/${ID.barbers.peti}/idegen-${Date.now()}.png`)).error).not.toBeNull();
    expect((await upload(anna, `barbers/${ID.barbers.peti}/vendeg-${Date.now()}.png`)).error).not.toBeNull();
    expect((await upload(anonClient(), `barbers/${ID.barbers.peti}/anon-${Date.now()}.png`)).error).not.toBeNull();
    expect((await upload(peti, `masik/${Date.now()}.png`)).error).not.toBeNull();

    // Nyilvánosan letölthető (a nyilvános oldalakon látszik)
    const { data } = anonClient().storage.from("avatars").getPublicUrl(own);
    expect((await fetch(data.publicUrl)).status).toBe(200);
  });

  it("a képet csak a tulajdonosa törölheti", async () => {
    const own = `barbers/${ID.barbers.peti}/torles-${Date.now()}.png`;
    await upload(peti, own);
    // Laci törlési kísérlete nem talál semmit (nem látja), a fájl megmarad
    await laci.storage.from("avatars").remove([own]);
    const { data: stillThere } = await peti.storage.from("avatars").list(`barbers/${ID.barbers.peti}`, { search: "torles-" });
    expect(stillThere!.length).toBe(1);
    expect((await peti.storage.from("avatars").remove([own])).error).toBeNull();
    const { data: gone } = await peti.storage.from("avatars").list(`barbers/${ID.barbers.peti}`, { search: "torles-" });
    expect(gone).toHaveLength(0);
  });

  it("az avatar_path csak a saját mappára mutathat", async () => {
    const res = await peti
      .from("barbers")
      .update({ avatar_path: `barbers/${ID.barbers.laci}/kep.webp` })
      .eq("id", ID.barbers.peti);
    expect(res.error).not.toBeNull();
    const ok = await peti
      .from("barbers")
      .update({ avatar_path: `barbers/${ID.barbers.peti}/kep.webp` })
      .eq("id", ID.barbers.peti);
    expect(ok.error).toBeNull();
  });
});

describe("Megbízható vendég", () => {
  it("a barber a saját vendégét jelölheti; más barber vendégét és más mezőt nem; a vendég nem", async () => {
    const mark = await peti
      .from("barber_customers")
      .update({ is_trusted: true })
      .eq("barber_id", ID.barbers.peti)
      .eq("customer_id", ID.users.anna)
      .select("is_trusted");
    expect(mark.data).toEqual([{ is_trusted: true }]);

    // Laci vendégét (Béla) Peti nem látja, nem módosíthatja
    const foreign = await peti
      .from("barber_customers")
      .update({ is_trusted: true })
      .eq("barber_id", ID.barbers.laci)
      .select("customer_id");
    expect(foreign.data ?? []).toHaveLength(0);

    // Más oszlopot nem írhat (pl. a vendéget nem cserélheti le)
    const swap = await peti
      .from("barber_customers")
      .update({ customer_id: ID.users.bela })
      .eq("barber_id", ID.barbers.peti)
      .eq("customer_id", ID.users.anna);
    expect(swap.error).not.toBeNull();

    // A vendég maga nem jelölheti magát megbízhatónak
    const self = await anna.from("barber_customers").update({ is_trusted: true }).eq("customer_id", ID.users.anna).select("barber_id");
    expect(self.data ?? []).toHaveLength(0);
  });
});
