"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedBarber, requireUser } from "@/backend/auth/auth.service";
import { appOrigin } from "@/backend/core/origin";
import { ROUTES } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { validateInviteEmail, validateShop } from "@/shared/validation/forms";
import {
  type ShopCalendarEntry,
  acceptInvite,
  declineInvite,
  getShopCalendar,
  inviteBarber,
  leaveShop,
  removeMember,
  revokeInvite,
  saveShop,
} from "./shops.service";

const MAX_RANGE_DAYS = 62;

/** Egység létrehozása / adatainak mentése (elutasítás után: javítás és újraküldés) */
export async function saveShopAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireApprovedBarber(ROUTES.myShop);
  const values = {
    name: field(formData, "name"),
    slug: field(formData, "slug"),
    city: field(formData, "city"),
    address: field(formData, "address"),
    phone: field(formData, "phone"),
    bio: field(formData, "bio"),
    instagram: field(formData, "instagram"),
  };

  if (!user.ownedShop && user.barber?.shopId) {
    return { error: "Már egy egység tagja vagy. Saját egység indításához előbb lépj ki onnan.", values };
  }

  const checked = validateShop(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await saveShop(user.barber!.id, user.ownedShop, checked.data);
  if (!result.ok) {
    return result.field ? { fieldErrors: { [result.field]: result.error }, values } : { error: result.error, values };
  }

  revalidatePath(ROUTES.myShop);
  return {
    success: user.ownedShop
      ? user.ownedShop.status === "rejected"
        ? "Javítva és újraküldve – az admin hamarosan elbírálja."
        : "Egység adatai elmentve."
      : "Egységed létrejött! Amint az admin jóváhagyja, meghívhatod a barbereidet.",
  };
}

/** Barber meghívása e-mail-cím alapján. A választ a meghívó linkkel adja vissza. */
export async function inviteBarberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireApprovedBarber(ROUTES.myShop);
  if (!user.ownedShop) return { error: "Nincs egységed." };

  const email = field(formData, "email");
  const checked = validateInviteEmail(email);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values: { email } };

  const result = await inviteBarber(user.ownedShop.id, checked.data.email);
  if (!result.ok) {
    return result.field ? { fieldErrors: { [result.field]: result.error }, values: { email } } : { error: result.error };
  }

  revalidatePath(ROUTES.myShop);
  // Az e-mail értesítés a 8. fázisban jön – addig a vezető maga küldi el a linket
  const link = `${await appOrigin()}${ROUTES.invite}/${result.token}`;
  return { success: `Meghívó létrehozva. Küldd el ezt a linket a barbernek (7 napig érvényes): ${link}` };
}

export async function revokeInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedBarber(ROUTES.myShop);
  const result = await revokeInvite(field(formData, "inviteId"));
  if (!result.ok) return { error: result.error };
  revalidatePath(ROUTES.myShop);
  return { success: "Meghívó visszavonva." };
}

export async function removeMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedBarber(ROUTES.myShop);
  const result = await removeMember(field(formData, "barberId"));
  if (!result.ok) return { error: result.error };
  revalidatePath(ROUTES.myShop);
  return { success: "A barber kikerült az egységből – újra önállóként dolgozik." };
}

/** Meghívó elfogadása a /meghivas/[token] oldalon */
export async function acceptInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = field(formData, "token");
  await requireUser(`${ROUTES.invite}/${token}`);
  const result = await acceptInvite(token);
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  redirect(ROUTES.barberCalendar);
}

export async function declineInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = field(formData, "token");
  await requireUser(`${ROUTES.invite}/${token}`);
  const result = await declineInvite(token);
  if (!result.ok) return { error: result.error };
  return { success: "A meghívót elutasítottad." };
}

/** Kilépés az egységből (újra önálló barber lesz) */
export async function leaveShopAction(): Promise<FormState> {
  await requireApprovedBarber(ROUTES.barberCalendar);
  const result = await leaveShop();
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  return { success: "Kiléptél az egységből – mostantól önálló barberként jelensz meg." };
}

/** A vezető áttekintése a tagok naptáráról (a látható időszakra) */
export async function loadShopCalendarAction(from: string, to: string): Promise<ShopCalendarEntry[]> {
  const user = await requireApprovedBarber(ROUTES.myShop);
  if (!user.ownedShop) return [];
  const start = new Date(from);
  const end = new Date(to);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (Number.isNaN(days) || days <= 0 || days > MAX_RANGE_DAYS) return [];
  return getShopCalendar(start.toISOString(), end.toISOString());
}
