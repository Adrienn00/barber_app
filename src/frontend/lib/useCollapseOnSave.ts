"use client";

import { useContext, useEffect } from "react";
import { CollapsibleSectionContext } from "@/frontend/components/ui/CollapsibleSection";
import type { FormState } from "@/shared/types/form";

/**
 * Sikeres mentés után összecsukja a körülötte lévő CollapsibleSection-t (ha van ilyen).
 * Figyelmeztetésnél nyitva marad, hogy el lehessen olvasni.
 */
export function useCollapseOnSave(state: FormState) {
  const section = useContext(CollapsibleSectionContext);
  useEffect(() => {
    if (state.success && !state.warning && !state.error) section?.saved();
  }, [state, section]);
}
