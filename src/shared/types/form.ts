/**
 * Egy űrlap-művelet (server action) válasza, amit az űrlap megjelenít.
 * - error: általános hibaüzenet az űrlap tetején
 * - fieldErrors: mezőnkénti hibák (a mező neve szerint)
 * - success: sikerüzenet
 * - values: a beküldött értékek, hogy hiba után ne kelljen újra begépelni
 * - redirectTo: siker után ide töltse be a böngésző az oldalt (teljes oldalbetöltéssel)
 */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  values?: Record<string, string>;
  redirectTo?: string;
};

/** Szöveges mező kiolvasása az űrlapból (üres, ha nincs) */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
