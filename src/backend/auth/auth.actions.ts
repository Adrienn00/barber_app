"use server";

import { redirect } from "next/navigation";
import {
  signInWithPassword,
  signOut,
  signUp,
  startGoogleSignIn,
} from "@/backend/auth/auth.service";
import { ROUTES, afterLoginPath, safeNextPath } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { validateLogin, validateRegistration } from "@/shared/validation/forms";

/** Belépés e-maillel és jelszóval */
export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(field(formData, "next"));

  const checked = validateLogin({ email, password });
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values: { email } };

  const result = await signInWithPassword(email, password);
  if (!result.ok) return { error: result.error, values: { email } };

  // Teljes oldalbetöltéssel megy tovább, hogy minden már a friss bejelentkezéssel töltődjön be
  return { redirectTo: afterLoginPath(next) };
}

/** Regisztráció (név, telefon, e-mail, jelszó, feltételek elfogadása) */
export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    fullName: field(formData, "fullName"),
    phone: field(formData, "phone"),
    email: field(formData, "email").toLowerCase(),
  };
  const next = safeNextPath(field(formData, "next"));

  const checked = validateRegistration({
    ...values,
    password: String(formData.get("password") ?? ""),
    termsAccepted: formData.get("terms") === "on",
  });
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await signUp({ ...checked.data, nextPath: next });
  if (!result.ok) return { error: result.error, values };
  if (result.needsEmailConfirmation) {
    return { success: "Küldtünk egy megerősítő e-mailt. Kattints a benne lévő linkre, és már be is léphetsz." };
  }

  // Teljes oldalbetöltéssel megy tovább, hogy minden már a friss bejelentkezéssel töltődjön be
  return { redirectTo: afterLoginPath(next) };
}

/** Google-belépés indítása */
export async function signInWithGoogleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await startGoogleSignIn(safeNextPath(field(formData, "next")));
  if ("error" in result) return { error: result.error };
  redirect(result.url);
}

/** Kijelentkezés */
export async function signOutAction(): Promise<void> {
  await signOut();
  redirect(ROUTES.home);
}
