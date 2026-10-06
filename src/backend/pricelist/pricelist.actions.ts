"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { validateService } from "@/shared/validation/pricelist";
import { moveService, removeService, saveService, setServiceActive } from "./pricelist.service";

async function currentBarberId(): Promise<string> {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  return user.barber!.id;
}

function refresh() {
  revalidatePath(ROUTES.barberSettings);
  revalidatePath(ROUTES.barberCalendar);
  revalidatePath(ROUTES.barberSetup); // a beállító varázsló is ezeket a szerkesztőket használja
}

/** Szolgáltatás felvétele / módosítása (név, saját időtartam, ár) */
export async function saveServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const barberId = await currentBarberId();
  const values = {
    name: field(formData, "name"),
    durationMin: field(formData, "durationMin"),
    price: field(formData, "price"),
  };
  const checked = validateService(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const serviceId = field(formData, "serviceId") || null;
  const result = await saveService(barberId, serviceId, checked.data);
  if (!result.ok) return { error: result.error, values };

  refresh();
  return { success: serviceId ? "Szolgáltatás módosítva." : "Szolgáltatás felvéve." };
}

/** Elrejtés, újra megjelenítés, törlés, sorrend – a lista soraiban lévő gombok */
export async function serviceRowAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const barberId = await currentBarberId();
  const serviceId = field(formData, "serviceId");
  const op = field(formData, "op");

  const result =
    op === "hide" || op === "show"
      ? await setServiceActive(serviceId, op === "show")
      : op === "delete"
        ? await removeService(serviceId)
        : op === "up" || op === "down"
          ? await moveService(barberId, serviceId, op)
          : { ok: false as const, error: "Érvénytelen kérés." };

  if (!result.ok) return { error: result.error };
  refresh();
  const messages: Record<string, string> = {
    hide: "Elrejtve – a vendégek nem látják, de a meglévő foglalások megmaradnak.",
    show: "Újra látható a vendégeknek.",
    delete: "Szolgáltatás törölve.",
  };
  return { success: messages[op] ?? "Sorrend módosítva." };
}
