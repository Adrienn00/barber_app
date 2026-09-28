"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/shared/types/form";

/**
 * Ha egy űrlap-művelet új választ ad (siker vagy hiba), meghívja a callbacket – pl. hogy a naptár
 * frissüljön és bezáródjon az ablak. Mezőhibánál nem hív (azt az űrlap maga mutatja).
 */
export function useOnActionResult(state: FormState, callback: (state: FormState) => void, onlySuccess = false) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (state.success || (!onlySuccess && state.error)) callbackRef.current(state);
  }, [state, onlySuccess]);
}
