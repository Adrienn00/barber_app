import { describe, expect, it } from "vitest";
import { validateService } from "./pricelist";

describe("validateService", () => {
  it("érvényes szolgáltatás, tizedesvesszős árral", () => {
    expect(validateService({ name: " Hajvágás ", durationMin: "45", price: "62,5" })).toEqual({
      ok: true,
      data: { name: "Hajvágás", durationMin: 45, price: 62.5 },
    });
  });

  it("a kezdő barber hosszabb időt is megadhat (pl. 55 perc)", () => {
    const r = validateService({ name: "Hajvágás", durationMin: "55", price: "60" });
    expect(r.ok && r.data.durationMin).toBe(55);
  });

  it("hibák: üres név, nem 5 perces lépés, túl hosszú, érvénytelen ár", () => {
    const r = validateService({ name: "", durationMin: "42", price: "abc" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["durationMin", "name", "price"]);
    const tooLong = validateService({ name: "X", durationMin: "500", price: "10" });
    expect(tooLong.ok).toBe(false);
  });
});
