import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ID, serviceClient, userClient } from "./helpers";

// A barber indulóoldala: a sajátját állíthatja, csak a megengedett értékekre; másét és vendégként nem.
const service = serviceClient();
let peti: SupabaseClient;
let anna: SupabaseClient;

const startPageOf = async (barberId: string) =>
  (await service.from("barber_settings").select("start_page").eq("barber_id", barberId).single()).data!.start_page;

beforeAll(async () => {
  [peti, anna] = await Promise.all([userClient("peti@barber.test"), userClient("anna@vendeg.test")]);
});

afterAll(async () => {
  await service.from("barber_settings").update({ start_page: "home" }).in("barber_id", [ID.barbers.peti, ID.barbers.laci]);
});

describe("Indulóoldal (barber_settings.start_page)", () => {
  it("alapból a kezdőlap; a barber a sajátját átállíthatja", async () => {
    expect(await startPageOf(ID.barbers.laci)).toBe("home");
    const res = await peti.from("barber_settings").update({ start_page: "new_booking" }).eq("barber_id", ID.barbers.peti).select();
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(await startPageOf(ID.barbers.peti)).toBe("new_booking");
  });

  it("NEM: ismeretlen érték, más barberé, vendégként", async () => {
    expect((await peti.from("barber_settings").update({ start_page: "admin" }).eq("barber_id", ID.barbers.peti)).error).not.toBeNull();
    await peti.from("barber_settings").update({ start_page: "calendar" }).eq("barber_id", ID.barbers.laci);
    await anna.from("barber_settings").update({ start_page: "calendar" }).eq("barber_id", ID.barbers.laci);
    expect(await startPageOf(ID.barbers.laci)).toBe("home");
  });
});
