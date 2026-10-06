"use client";

/**
 * A kiválasztott fotót a böngészőben négyzetesre vágja és kicsinyíti (pl. 512 px), így a
 * telefonos, akár 5–10 MB-os kép is gyorsan feltölthető. A szerver ettől függetlenül újrakódolja.
 */
export async function resizeToSquare(file: File, size = 512): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  // WebP, ha a böngésző tud ilyet készíteni (Safari régebben nem) – különben JPEG
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  const final =
    blob && blob.type === "image/webp"
      ? blob
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!final) throw new Error("toBlob");
  return new File([final], final.type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type: final.type });
}
