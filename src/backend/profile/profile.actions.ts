"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/backend/auth/auth.service";
import { updateMyProfile } from "@/backend/profile/profile.service";
import { ROUTES, loginPath, safeNextPath } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { validateProfile } from "@/shared/validation/forms";

/** Profil mentése / kiegészítése (név, kötelező telefon, feltételek) */
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(ROUTES.profile));

  const values = { fullName: field(formData, "fullName"), phone: field(formData, "phone") };
  const next = safeNextPath(field(formData, "next"));
  const acceptTerms = !user.termsAccepted && formData.get("terms") === "on";

  const checked = validateProfile({ ...values, termsAccepted: user.termsAccepted || acceptTerms });
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await updateMyProfile(user.id, { ...checked.data, acceptTerms });
  if (!result.ok) return { error: result.error, values };

  revalidatePath("/", "layout");
  // Első kitöltés után tovább oda, ahova indult (vagy a szerepkörének megfelelő kezdőoldalra)
  if (!user.isProfileComplete || next) {
    redirect(next ?? homePathFor({ ...user, isProfileComplete: true }));
  }
  return { success: "A profilod elmentve.", values };
}
