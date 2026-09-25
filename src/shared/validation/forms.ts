import { normalizePhone } from "./phone";
import { validateSlug } from "./slug";

/** Egy ellenőrzés eredménye: vagy a megtisztított adatok, vagy mezőnkénti hibák. */
export type Validated<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

function result<T>(errors: Record<string, string>, data: T): Validated<T> {
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, data };
}

function checkName(name: string, errors: Record<string, string>, key = "fullName") {
  if (name.length < 2) errors[key] = "Add meg a neved.";
  else if (name.length > 100) errors[key] = "Legfeljebb 100 karakter lehet.";
}

function checkPhone(phone: string, errors: Record<string, string>, key = "phone"): string {
  const normalized = normalizePhone(phone);
  if (!phone) errors[key] = "Add meg a telefonszámod.";
  else if (!normalized) errors[key] = "Érvénytelen telefonszám. Pl. 0745 123 456 vagy +40 745 123 456.";
  return normalized ?? "";
}

// --- Belépés -----------------------------------------------------------------
export function validateLogin(input: { email: string; password: string }) {
  const errors: Record<string, string> = {};
  if (!EMAIL_RE.test(input.email)) errors.email = "Adj meg egy érvényes e-mail-címet.";
  if (!input.password) errors.password = "Add meg a jelszavad.";
  return result(errors, input);
}

// --- Regisztráció ------------------------------------------------------------
export function validateRegistration(input: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  termsAccepted: boolean;
}) {
  const errors: Record<string, string> = {};
  checkName(input.fullName, errors);
  const phone = checkPhone(input.phone, errors);
  if (!EMAIL_RE.test(input.email)) errors.email = "Adj meg egy érvényes e-mail-címet.";
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A jelszó legalább ${MIN_PASSWORD_LENGTH} karakter legyen.`;
  }
  if (!input.termsAccepted) errors.terms = "A regisztrációhoz el kell fogadnod a feltételeket.";
  return result(errors, { ...input, phone });
}

// --- Profil ------------------------------------------------------------------
export function validateProfile(input: { fullName: string; phone: string; termsAccepted: boolean }) {
  const errors: Record<string, string> = {};
  checkName(input.fullName, errors);
  const phone = checkPhone(input.phone, errors);
  if (!input.termsAccepted) errors.terms = "A használathoz el kell fogadnod a feltételeket.";
  return result(errors, { ...input, phone });
}

// --- Barberjelentkezés -------------------------------------------------------
export type BarberApplicationInput = {
  displayName: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  bio: string;
  instagram: string;
};

export function validateBarberApplication(input: BarberApplicationInput) {
  const errors: Record<string, string> = {};
  if (input.displayName.length < 2 || input.displayName.length > 60) {
    errors.displayName = "A megjelenített név 2–60 karakter legyen.";
  }
  const slug = input.slug.toLowerCase();
  const slugError = validateSlug(slug);
  if (slugError) errors.slug = slugError;
  if (input.city.length < 2 || input.city.length > 60) errors.city = "Add meg a várost.";
  if (input.address.length < 3 || input.address.length > 200) errors.address = "Add meg a címet.";
  const phone = checkPhone(input.phone, errors);
  if (input.bio.length > 1000) errors.bio = "A bemutatkozás legfeljebb 1000 karakter lehet.";
  const instagram = input.instagram.replace(/^@/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    errors.instagram = "Csak a felhasználónevet add meg, pl. peti.barber";
  }
  return result(errors, { ...input, slug, phone, instagram });
}
