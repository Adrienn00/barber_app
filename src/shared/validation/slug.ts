/**
 * Foglalt szavak – ezek nem lehetnek barberlinkek.
 * FIGYELEM: az adatbázisban is szerepel (private.is_reserved_slug), a kettőt együtt kell módosítani.
 */
export const RESERVED_SLUGS = [
  "admin", "api", "app", "auth", "aszf", "adatvedelem", "barber", "barberek", "barber-leszek",
  "beallitasok", "belepes", "egyseg", "egysegek", "foglalas", "foglalasaim", "keresek", "kijelentkezes",
  "meghivas", "naptar", "platform", "profil", "regisztracio", "static", "www",
];

/** Linkjavaslat névből: „Kovács Péter” → „kovacs-peter” */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ékezetek (kombináló jelek) le
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}

/** Hibaüzenet, ha a link nem megfelelő; egyébként null. */
export function validateSlug(slug: string): string | null {
  if (slug.length < 3 || slug.length > 30) return "A link 3–30 karakter hosszú lehet.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return "Csak kisbetű, szám és kötőjel lehet benne (nem kezdődhet és végződhet kötőjellel).";
  }
  if (RESERVED_SLUGS.includes(slug)) return "Ez a link foglalt, válassz másikat.";
  return null;
}
