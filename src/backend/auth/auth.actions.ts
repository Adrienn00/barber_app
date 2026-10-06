"use server";

import { redirect } from "next/navigation";
import {
  getCurrentUser,
  requestPasswordReset,
  setNewPassword,
  signInWithPassword,
  signOut,
  signUp,
  startGoogleSignIn,
} from "@/backend/auth/auth.service";
import { removePushSubscription } from "@/backend/notifications/notifications.service";
import { ROUTES, afterLoginPath, safeNextPath } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { validateEmailOnly, validateLogin, validateNewPassword, validateRegistration } from "@/shared/validation/forms";

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

/** Kijelentkezés – ennek az eszköznek a push-feliratkozása is törlődik (a következő felhasználó ne kapja) */
export async function signOutAction(formData: FormData): Promise<void> {
  const pushEndpoint = field(formData, "pushEndpoint");
  if (pushEndpoint) await removePushSubscription(pushEndpoint);
  await signOut();
  redirect(ROUTES.home);
}

/** Elfelejtett jelszó: visszaállító link küldése e-mailben */
export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: field(formData, "email").toLowerCase() };
  const checked = validateEmailOnly(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };
  const result = await requestPasswordReset(checked.data.email);
  if (!result.ok) return { error: result.error, values };
  return {
    success: "Ha van fiók ezzel a címmel, elküldtük rá a jelszó-visszaállító linket. Nézd meg a leveleidet (a spam mappát is).",
  };
}

/** Új jelszó beállítása (a levélben kapott linkkel már be van lépve) */
export async function setNewPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) redirect(ROUTES.forgotPassword);
  const checked = validateNewPassword({
    password: String(formData.get("password") ?? ""),
    passwordAgain: String(formData.get("passwordAgain") ?? ""),
  });
  if (!checked.ok) return { fieldErrors: checked.fieldErrors };
  const result = await setNewPassword(checked.data.password);
  if (!result.ok) return { error: result.error };
  return { success: "Az új jelszavad elmentve.", redirectTo: ROUTES.afterLogin };
}
