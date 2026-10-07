import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sharp = (await import("sharp")).default;
const { detectImageType, processAvatarFile } = await import("./avatar");

const bytes = (...values: (number | string)[]) =>
  Uint8Array.from(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("profilkép: a fájl valódi típusa", () => {
  it("felismeri a JPG, PNG és WebP fájlt az első bájtjaiból", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(detectImageType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("webp");
  });

  it("mást nem fogad el (pl. SVG, GIF, szöveg)", () => {
    expect(detectImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectImageType(bytes("GIF89a"))).toBeNull();
    expect(detectImageType(bytes(""))).toBeNull();
  });

  it("a „PNG”-nek álcázott SVG-t elutasítja; a valódi képet 512 px-es webp-vé alakítja", async () => {
    const fake = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], "kep.png", { type: "image/png" });
    expect(await processAvatarFile(fake)).toEqual({ ok: false, error: "JPG, PNG vagy WebP képet tölts fel." });

    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#d4a95e" } }).png().toBuffer();
    const result = await processAvatarFile(new File([new Uint8Array(png)], "kep.png", { type: "image/png" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const meta = await sharp(result.bytes).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["webp", 512, 512]);
    }
  });
});
