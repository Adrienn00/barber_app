"use client";

import { useEffect } from "react";
import { isPushSupported, registerServiceWorker } from "@/frontend/lib/push";
// Betöltéskor elkezdi figyelni, ha a böngésző telepíthetőnek jelzi az appot (Android)
import "@/frontend/lib/installPrompt";

/** Láthatatlan: betöltéskor regisztrálja a service workert (push-értesítés, telepíthető app), és figyeli a telepíthetőséget. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (isPushSupported()) void registerServiceWorker().catch(() => {});
  }, []);
  return null;
}
