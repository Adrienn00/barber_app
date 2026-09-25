"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/backend/auth/auth.service";
import { saveMyBarberApplication } from "@/backend/barbers/barbers.service";
import { ROUTES, loginPath } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { validateBarberApplication } from "@/shared/validation/forms";

/** Barberjelentkezés beküldése, javítása vagy (elutasítás után) újraküldése */
export async function saveBarberApplicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(ROUTES.becomeBarber));
  if (!user.isProfileComplete) redirect(`${ROUTES.profile}?next=${ROUTES.becomeBarber}`);

  const values = {
    displayName: field(formData, "displayName"),
    slug: field(formData, "slug"),
    city: field(formData, "city"),
    address: field(formData, "address"),
    phone: field(formData, "phone"),
    bio: field(formData, "bio"),
    instagram: field(formData, "instagram"),
  };

  if (user.barber && (user.barber.status === "approved" || user.barber.status === "suspended")) {
    return { error: "A jelentkezésed már el lett bírálva.", values };
  }

  const checked = validateBarberApplication(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await saveMyBarberApplication(user.id, user.barber, checked.data);
  if (!result.ok) {
    return result.field ? { fieldErrors: { [result.field]: result.error }, values } : { error: result.error, values };
  }

  revalidatePath(ROUTES.becomeBarber);
  return {
    success: user.barber
      ? "Jelentkezésed frissítve. Az admin hamarosan elbírálja."
      : "Jelentkezésed elküldtük! Amint az admin jóváhagyja, értesítünk.",
  };
}
