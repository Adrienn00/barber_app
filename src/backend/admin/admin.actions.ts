"use server";

import { revalidatePath } from "next/cache";
import { setBarberStatus, setShopStatus, setUserAdmin } from "@/backend/admin/admin.service";
import { requireAdmin } from "@/backend/auth/auth.service";
import type { BarberStatus } from "@/shared/types/domain";
import { ROUTES } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { validateEmailOnly } from "@/shared/validation/forms";

const ALLOWED: BarberStatus[] = ["approved", "rejected", "suspended"];

const SUCCESS: Record<string, string> = {
  approved: "Jóváhagyva.",
  rejected: "Elutasítva.",
  suspended: "Felfüggesztve – a jövőbeli foglalásai lemondva.",
};

/** Barber jóváhagyása / elutasítása / felfüggesztése / visszaállítása */
export async function changeBarberStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin(ROUTES.platform);

  const barberId = field(formData, "barberId");
  const status = field(formData, "status") as BarberStatus;
  const reason = field(formData, "reason");
  if (!barberId || !ALLOWED.includes(status)) return { error: "Érvénytelen kérés." };
  if (status === "rejected" && !reason) return { fieldErrors: { reason: "Írd meg röviden az elutasítás okát." } };

  const result = await setBarberStatus(barberId, status, reason);
  if (!result.ok) return { error: result.error };

  revalidatePath(ROUTES.platform);
  return { success: SUCCESS[status] };
}

/** Egység jóváhagyása / elutasítása / felfüggesztése / visszaállítása */
export async function changeShopStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin(ROUTES.platform);

  const shopId = field(formData, "shopId");
  const status = field(formData, "status") as BarberStatus;
  const reason = field(formData, "reason");
  if (!shopId || !ALLOWED.includes(status)) return { error: "Érvénytelen kérés." };
  if (status === "rejected" && !reason) return { fieldErrors: { reason: "Írd meg röviden az elutasítás okát." } };

  const result = await setShopStatus(shopId, status, reason);
  if (!result.ok) return { error: result.error };

  revalidatePath(ROUTES.platform);
  return { success: status === "suspended" ? "Egység felfüggesztve." : SUCCESS[status] };
}

/** Admin jog megadása egy regisztrált felhasználónak (e-mail-cím alapján) */
export async function grantAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin(ROUTES.platform);
  const values = { email: field(formData, "email").toLowerCase() };
  const checked = validateEmailOnly(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await setUserAdmin(checked.data.email, true);
  if (!result.ok) return { error: result.error, values };
  revalidatePath(ROUTES.platform);
  return { success: `${checked.data.email} mostantól admin – értesítést kapott róla.` };
}

/** Admin jog elvétele (saját magától senki nem veheti el) */
export async function revokeAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin(ROUTES.platform);
  const result = await setUserAdmin(field(formData, "email"), false);
  if (!result.ok) return { error: result.error };
  revalidatePath(ROUTES.platform);
  return { success: "Admin jog elvéve." };
}
