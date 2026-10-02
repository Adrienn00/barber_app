import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ID, serviceClient, userClient } from "./helpers";

const service = serviceClient();
let peti: SupabaseClient;
let original: { weekday: number; start_time: string; end_time: string }[] = [];

async function petiHours() {
  const { data } = await service
    .from("working_hours")
    .select("weekday, start_time, end_time")
    .eq("barber_id", ID.barbers.peti)
    .order("weekday")
    .order("start_time");
  return data ?? [];
}

beforeAll(async () => {
  peti = await userClient("peti@barber.test");
  original = await petiHours();
});

afterAll(async () => {
  // Az eredeti munkaidő visszaállítása (más tesztek is használják)
  await service.from("working_hours").delete().eq("barber_id", ID.barbers.peti);
  await service.from("working_hours").insert(original.map((h) => ({ ...h, barber_id: ID.barbers.peti })));
  await service.from("barber_settings").update({ buffer_min: 5, slot_step_min: 15 }).eq("barber_id", ID.barbers.peti);
});

describe("Munkaidő mentése (set_my_working_hours)", () => {
  it("a teljes hetet egyben cseréli (ebédszünetes nappal)", async () => {
    const res = await peti.rpc("set_my_working_hours", {
      p_slots: [
        { weekday: 1, start: "08:00", end: "12:00" },
        { weekday: 1, start: "13:00", end: "17:00" },
        { weekday: 6, start: "10:00", end: "14:00" },
      ],
    });
    expect(res.error).toBeNull();
    expect(await petiHours()).toEqual([
      { weekday: 1, start_time: "08:00:00", end_time: "12:00:00" },
      { weekday: 1, start_time: "13:00:00", end_time: "17:00:00" },
      { weekday: 6, start_time: "10:00:00", end_time: "14:00:00" },
    ]);
  });

  it("hibás hétnél semmi nem változik (vagy minden, vagy semmi)", async () => {
    const before = await petiHours();
    const res = await peti.rpc("set_my_working_hours", {
      p_slots: [
        { weekday: 2, start: "09:00", end: "13:00" },
        { weekday: 2, start: "12:00", end: "15:00" }, // átfedés
      ],
    });
    expect(res.error?.code).toBe("22023");
    expect(res.error?.message).toContain("fedhetik");
    expect(await petiHours()).toEqual(before);
  });

  it("vendég nem állíthat munkaidőt; más barber munkaidejét nem írja át", async () => {
    const anna = await userClient("anna@vendeg.test");
    expect((await anna.rpc("set_my_working_hours", { p_slots: [] })).error?.code).toBe("42501");

    const laciBefore = (await service.from("working_hours").select("id").eq("barber_id", ID.barbers.laci)).data;
    await peti.rpc("set_my_working_hours", { p_slots: [{ weekday: 3, start: "09:00", end: "10:00" }] });
    const laciAfter = (await service.from("working_hours").select("id").eq("barber_id", ID.barbers.laci)).data;
    expect(laciAfter).toEqual(laciBefore);
  });
});

describe("Foglalási szabályok", () => {
  it("a barber a saját szabályait módosítja, másét nem", async () => {
    const own = await peti.from("barber_settings").update({ buffer_min: 10, slot_step_min: 30 }).eq("barber_id", ID.barbers.peti).select();
    expect(own.data).toHaveLength(1);
    const other = await peti.from("barber_settings").update({ buffer_min: 0 }).eq("barber_id", ID.barbers.laci).select();
    expect(other.data).toEqual([]);
  });
});
