"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, requireApprovedBarber } from "@/backend/auth/auth.service";
import {
  getMyBarberApplication,
  removeMyAvatar,
  replaceMyAvatar,
  saveMyBarberApplication,
  saveMyBarberProfile,
  setMyListing,
} from "@/backend/barbers/barbers.service";
import { ROUTES, barberPath, loginPath } from "@/shared/config/routes";
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

  // Az egész oldal frissüljön (pl. a meghívó oldala a profil mentése után engedi a csatlakozást)
  revalidatePath("/", "layout");
  return {
    success: user.barber
      ? "Jelentkezésed frissítve. Az admin hamarosan elbírálja."
      : "Jelentkezésed elküldtük! Amint az admin jóváhagyja, értesítünk.",
  };
}

function profileValues(formData: FormData) {
  return {
    displayName: field(formData, "displayName"),
    slug: field(formData, "slug"),
    city: field(formData, "city"),
    address: field(formData, "address"),
    phone: field(formData, "phone"),
    bio: field(formData, "bio"),
    instagram: field(formData, "instagram"),
  };
}

function refreshProfile(slugs: string[]) {
  revalidatePath(ROUTES.barberSettings);
  revalidatePath(ROUTES.barberSetup);
  revalidatePath(ROUTES.barbers);
  for (const slug of slugs) revalidatePath(barberPath(slug));
  revalidatePath("/", "layout");
}

/** Jóváhagyott barber: profil mentése (név, link, cím, telefon, bemutatkozás, Instagram) */
export async function saveBarberProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const values = profileValues(formData);
  const checked = validateBarberApplication(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const oldSlug = user.barber!.slug;
  const result = await saveMyBarberProfile(user.barber!.id, checked.data);
  if (!result.ok) {
    return result.field ? { fieldErrors: { [result.field]: result.error }, values } : { error: result.error, values };
  }
  refreshProfile([oldSlug, checked.data.slug]);
  return {
    success: "Profil mentve.",
    warning:
      oldSlug !== checked.data.slug
        ? `Profil mentve. Figyelem: a régi link (/b/${oldSlug}) mostantól nem működik – küldd el az újat a vendégeidnek.`
        : undefined,
    values,
  };
}

/** Megjelenés a nyilvános listában be/ki */
export async function setListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const listed = field(formData, "listed") === "true";
  const result = await setMyListing(user.barber!.id, listed);
  if (!result.ok) return { error: result.error };
  refreshProfile([user.barber!.slug]);
  return {
    success: listed
      ? "Megjelensz a nyilvános barberlistában."
      : "Nem jelensz meg a listában – a linkeden továbbra is foglalhatnak nálad.",
  };
}

/** Profilkép feltöltése / cseréje */
export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Válassz ki egy képet." };
  const current = await getMyBarberApplication(user.id);
  const result = await replaceMyAvatar(user.barber!.id, current?.avatarPath ?? null, file);
  if (!result.ok) return { error: result.error };
  refreshProfile([user.barber!.slug]);
  return { success: "Profilkép mentve." };
}

export async function removeAvatarAction(): Promise<FormState> {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const current = await getMyBarberApplication(user.id);
  const result = await removeMyAvatar(user.barber!.id, current?.avatarPath ?? null);
  if (!result.ok) return { error: result.error };
  refreshProfile([user.barber!.slug]);
  return { success: "Profilkép törölve." };
}
