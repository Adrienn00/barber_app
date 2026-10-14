import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type ResizeOptions } from "sharp";
import type { DbClient } from "./server-client";

// =============================================================================
// Profilkép / logó (barber és egység közös): ellenőrzés, 512 px-es négyzetes webp, feltöltés, törlés.
// A vágásnapló fotója ugyanígy ellenőrizve, de vágás nélkül (processPhotoFile).
// A Storage-szabály (20261009090000_avatars.sql) csak a saját mappába enged írni:
//   barbers/<barber_id>/…, shops/<shop_id>/…
// =============================================================================

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * A fájl valódi típusa az első bájtjai alapján (a böngésző által megadott típusban nem bízunk:
 * így nem lehet pl. SVG-t vagy más formátumot „PNG”-nek álcázva a képfeldolgozóba juttatni).
 */
export function detectImageType(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

type Processed = { ok: true; bytes: Buffer } | { ok: false; error: string };

/**
 * Ellenőrzés + átméretezés + webp. Az újrakódolás a telefonos fotók rejtett adatait (pl. GPS-helyet)
 * is eltávolítja.
 */
async function processImage(file: File, resize: ResizeOptions): Promise<Processed> {
  if (!TYPES.includes(file.type)) return { ok: false, error: "JPG, PNG vagy WebP képet tölts fel." };
  if (file.size > MAX_BYTES) return { ok: false, error: "A kép legfeljebb 3 MB lehet." };
  const input = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(input);
  if (!type) return { ok: false, error: "JPG, PNG vagy WebP képet tölts fel." };
  try {
    // A feldolgozó csak a felismert formátumot fogadja el (más formátumot nem próbál értelmezni)
    const bytes = await sharp(input, { failOn: "error" }).rotate().resize(resize).webp({ quality: 82 }).toBuffer();
    return { ok: true, bytes };
  } catch {
    return { ok: false, error: "Ezt a képet nem sikerült beolvasni. Próbálj egy másikat." };
  }
}

/** Profilkép / logó: négyzetesre vágva, 512 px */
export function processAvatarFile(file: File): Promise<Processed> {
  return processImage(file, { width: 512, height: 512, fit: "cover" });
}

/** Vágásfotó: nem vágjuk meg, a hosszabbik oldala legfeljebb 1280 px */
export function processPhotoFile(file: File): Promise<Processed> {
  return processImage(file, { width: 1280, height: 1280, fit: "inside", withoutEnlargement: true });
}

/** Új, egyedi fájlnév a megadott mappában (pl. barbers/<id>) */
export function newAvatarPath(folder: string): string {
  return `${folder}/${randomUUID()}.webp`;
}

export function uploadAvatarFile(db: DbClient, path: string, bytes: Buffer) {
  return db.storage.from("avatars").upload(path, bytes, { contentType: "image/webp", cacheControl: "31536000" });
}

export function removeAvatarFiles(db: DbClient, paths: string[]) {
  return db.storage.from("avatars").remove(paths);
}
