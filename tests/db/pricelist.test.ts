import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, anonClient, serviceClient, userClient } from "./helpers";

const service = serviceClient();
const created: string[] = [];
let peti: SupabaseClient;
let laci: SupabaseClient;

beforeAll(async () => {
  [peti, laci] = await Promise.all([userClient("peti@barber.test"), userClient("laci@barber.test")]);
});

afterAll(async () => {
  if (created.length) await service.from("services").delete().in("id", created);
});

describe("Árlista: minden barber a saját időtartamát adja meg", () => {
  it("a barber saját szolgáltatást vesz fel és módosítja az időtartamát", async () => {
    const { data, error } = await peti
      .from("services")
      .insert({ barber_id: ID.barbers.peti, name: "Kezdő hajvágás", duration_min: 55, price: 45 })
      .select("id")
      .single();
    expect(error).toBeNull();
    created.push(data!.id);

    const upd = await peti.from("services").update({ duration_min: 40 }).eq("id", data!.id).select("duration_min").single();
    expect(upd.data!.duration_min).toBe(40);
  });

  it("két barbernek ugyanaz a szolgáltatás lehet eltérő időtartammal", async () => {
    const { data } = await anonClient()
      .from("services")
      .select("barber_id, name, duration_min")
      .eq("name", "Hajvágás")
      .in("barber_id", [ID.barbers.peti, ID.barbers.laci]);
    const byBarber = Object.fromEntries((data ?? []).map((s) => [s.barber_id, s.duration_min]));
    expect(byBarber[ID.barbers.peti]).toBe(30);
    expect(byBarber[ID.barbers.laci]).toBe(40);
  });

  it("más barber szolgáltatását nem veheti fel, nem módosíthatja, nem törölheti", async () => {
    expect(
      (await laci.from("services").insert({ barber_id: ID.barbers.peti, name: "X", duration_min: 30, price: 1 })).error
        ?.code,
    ).toBe("42501");
    expect((await laci.from("services").update({ duration_min: 5 }).eq("id", ID.services.petiHajvagas).select()).data).toEqual([]);
    expect((await laci.from("services").delete().eq("id", ID.services.petiHajvagas).select()).data).toEqual([]);
  });

  it("foglalt szolgáltatás nem törölhető (csak elrejthető); az elrejtett a vendégnek nem látszik", async () => {
    const del = await peti.from("services").delete().eq("id", ID.services.petiHajvagas);
    expect(del.error?.code).toBe("23503");

    const hide = await peti.from("services").update({ is_active: false }).eq("id", ID.services.petiHajvagas).select();
    expect(hide.data).toHaveLength(1);
    expect((await anonClient().from("services").select("id").eq("id", ID.services.petiHajvagas)).data).toEqual([]);
    await peti.from("services").update({ is_active: true }).eq("id", ID.services.petiHajvagas);
  });

  it("érvénytelen időtartamot az adatbázis sem enged (pl. 0 vagy 9 óra)", async () => {
    const res = await peti.from("services").insert({ barber_id: ID.barbers.peti, name: "Rossz", duration_min: 0, price: 1 });
    expect(res.error?.code).toBe("23514");
  });
});
