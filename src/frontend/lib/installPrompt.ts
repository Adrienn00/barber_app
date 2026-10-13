"use client";

import { isIos, isStandalone } from "./push";

// =============================================================================
// Telepítés a kezdőképernyőre (PWA).
//  - Androidon (Chrome) a böngésző jelzi, ha az app telepíthető („beforeinstallprompt”): ezt eltesszük,
//    és a gombra koppintva felajánljuk a telepítést.
//  - iPhone-on ilyen jelzés nincs: ott útmutatót mutatunk (Megosztás → Főképernyőhöz adás).
//  - Ha már telepítve van (önálló ablakban fut), nincs teendő.
// A jelzés az oldal betöltésekor bármikor jöhet, ezért a modul azonnal figyeli (a layout betölti).
// =============================================================================

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = "none" | "prompt" | "ios" | "installed";

let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Ne a böngésző saját sávja jöjjön fel váratlanul – a mi gombunk ajánlja fel
    event.preventDefault();
    deferred = event as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

export function subscribeInstall(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getInstallState(): InstallState {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isIos()) return "ios";
  return "none";
}

/** Felajánlja a telepítést (Androidon); true, ha a felhasználó elfogadta */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") installed = true;
  emit();
  return outcome === "accepted";
}
