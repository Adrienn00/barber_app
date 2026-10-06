"use client";

import { useEffect } from "react";
import { isPushSupported, registerServiceWorker } from "@/frontend/lib/push";

/** Láthatatlan: betöltéskor regisztrálja a service workert (push-értesítés, telepíthető app). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (isPushSupported()) void registerServiceWorker().catch(() => {});
  }, []);
  return null;
}
