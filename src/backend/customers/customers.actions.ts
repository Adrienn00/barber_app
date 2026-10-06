"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { setCustomerTrusted } from "./customers.service";

/** Vendég megbízhatónak jelölése (a kérése ezután azonnal megerősítésre kerül) vagy a jelölés levétele */
export async function setTrustedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const trusted = field(formData, "trusted") === "true";
  const result = await setCustomerTrusted(user.barber!.id, field(formData, "customerId"), trusted);
  if (!result.ok) return { error: result.error };
  revalidatePath(ROUTES.barberSettings);
  return { success: trusted ? "Megbízható vendég – a kérései azonnal megerősítésre kerülnek." : "Jelölés levéve." };
}
