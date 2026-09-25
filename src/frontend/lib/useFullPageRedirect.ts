"use client";

import { useEffect } from "react";
import type { FormState } from "@/shared/types/form";

/**
 * Ha az űrlap-művelet redirectTo-t ad vissza, teljes oldalbetöltéssel odamegy.
 * Belépés/regisztráció után így minden (fejléc, menü) a friss bejelentkezéssel töltődik be.
 * Visszaadja, hogy épp átirányít-e (pl. a gomb letiltásához).
 */
export function useFullPageRedirect(state: FormState): boolean {
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);
  return Boolean(state.redirectTo);
}
