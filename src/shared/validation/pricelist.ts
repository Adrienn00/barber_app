import type { Validated } from "./forms";

// Időtartam: 5 perces lépésekben, 5 perctől 8 óráig (az adatbázis is ezt engedi)
export const MIN_DURATION = 5;
export const MAX_DURATION = 480;
export const MAX_PRICE = 10_000;

export type ServiceInput = { name: string; durationMin: string; price: string };
export type ServiceData = { name: string; durationMin: number; price: number };

/** Szolgáltatás (név, időtartam percben, ár lejben) ellenőrzése */
export function validateService(input: ServiceInput): Validated<ServiceData> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (!name) errors.name = "Add meg a szolgáltatás nevét.";
  else if (name.length > 80) errors.name = "Legfeljebb 80 karakter lehet.";

  const durationMin = Number(input.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < MIN_DURATION || durationMin > MAX_DURATION) {
    errors.durationMin = `Az időtartam ${MIN_DURATION} és ${MAX_DURATION} perc között legyen.`;
  } else if (durationMin % 5 !== 0) {
    errors.durationMin = "Az időtartam 5 perces lépésekben adható meg (pl. 25, 30, 35).";
  }

  // Tizedesvessző is jó: „45,5”
  const price = Number(input.price.trim().replace(",", "."));
  if (input.price.trim() === "" || Number.isNaN(price) || price < 0 || price > MAX_PRICE) {
    errors.price = "Adj meg egy érvényes árat (lejben).";
  }

  return Object.keys(errors).length
    ? { ok: false, fieldErrors: errors }
    : { ok: true, data: { name, durationMin, price: Math.round(price * 100) / 100 } };
}
