import { describe, expect, it } from "vitest";
import { safeNextPath } from "../config/routes";
import { formatPhone, normalizePhone } from "./phone";
import { slugify, validateSlug } from "./slug";

describe("normalizePhone", () => {
  it.each([
    ["0745 123 456", "+40745123456"],
    ["+40 745-123-456", "+40745123456"],
    ["0040745123456", "+40745123456"],
    ["06 30 123 4567", "+36301234567"],
    ["+36 (30) 123 4567", "+36301234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "12345", "abc", "0745 12"])("érvénytelen: %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("romániai és magyar szám tagolása", () => {
    expect(formatPhone("+40745123456")).toBe("+40 745 123 456");
    expect(formatPhone("+36301234567")).toBe("+36 30 123 4567");
  });
});

describe("slugify / validateSlug", () => {
  it("ékezetes névből linket javasol", () => {
    expect(slugify("Kovács Péter")).toBe("kovacs-peter");
    expect(slugify("  Őrült Űrhajós Borbély!  ")).toBe("orult-urhajos-borbely");
  });

  it("jó linket elfogad, rosszat elutasít", () => {
    expect(validateSlug("kovacs-peter")).toBeNull();
    expect(validateSlug("ab")).not.toBeNull();
    expect(validateSlug("-rossz")).not.toBeNull();
    expect(validateSlug("Nagybetu")).not.toBeNull();
    expect(validateSlug("admin")).not.toBeNull();
  });
});

describe("safeNextPath", () => {
  it("csak appon belüli címet enged", () => {
    expect(safeNextPath("/barber-leszek")).toBe("/barber-leszek");
    expect(safeNextPath("https://gonosz.hu")).toBeNull();
    expect(safeNextPath("//gonosz.hu")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
