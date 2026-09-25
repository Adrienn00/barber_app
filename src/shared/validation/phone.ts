/**
 * Telefonszám egységes, nemzetközi formára hozása: "+40745123456".
 * - 0745 123 456   → +40745123456 (romániai belföldi)
 * - 06 30 123 4567 → +36301234567 (magyarországi belföldi)
 * - 0040… / 0036…  → +40… / +36…
 * Érvénytelen számnál null.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.trim().replace(/[\s\-./()]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  else if (/^06\d{9}$/.test(digits)) digits = `+36${digits.slice(2)}`;
  else if (/^0\d{9}$/.test(digits)) digits = `+40${digits.slice(1)}`;

  return /^\+\d{9,15}$/.test(digits) ? digits : null;
}

/** Megjelenítés: "+40745123456" → "+40 745 123 456", "+36301234567" → "+36 30 123 4567" */
export function formatPhone(phone: string): string {
  const compact = phone.replace(/\s/g, "");
  const ro = compact.match(/^\+40(\d{3})(\d{3})(\d{3})$/);
  if (ro) return `+40 ${ro[1]} ${ro[2]} ${ro[3]}`;
  const hu = compact.match(/^\+36(\d{2})(\d{3})(\d{4})$/);
  if (hu) return `+36 ${hu[1]} ${hu[2]} ${hu[3]}`;
  return phone;
}
