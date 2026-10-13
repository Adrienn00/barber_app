"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/frontend/components/ui/Button";
import { Icon } from "@/frontend/components/ui/Icon";
import { getInstallState, promptInstall, subscribeInstall } from "@/frontend/lib/installPrompt";

/**
 * „Telepítsd a telefonodra” gomb: Androidon egy koppintással telepít, iPhone-on rövid útmutatót mutat.
 * Ha már telepítve van, vagy a böngésző nem tudja telepíteni (pl. számítógépen), nem jelenik meg.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, () => "none" as const);
  const [showGuide, setShowGuide] = useState(false);

  if (state === "none" || state === "installed") return null;

  if (state === "prompt") {
    return (
      <Button variant="secondary" onClick={() => void promptInstall()} className={className}>
        <Icon name="phone" size={18} /> Telepítsd a telefonodra
      </Button>
    );
  }

  // iPhone / iPad
  return (
    <div className={`space-y-3 ${className}`}>
      <Button variant="secondary" onClick={() => setShowGuide(!showGuide)} aria-expanded={showGuide}>
        <Icon name="phone" size={18} /> Tedd ki a kezdőképernyőre
      </Button>
      {showGuide && (
        <ol className="ct-alert list-decimal space-y-1 rounded-lg border border-line bg-surface py-3 pr-4 pl-9 text-sm text-muted">
          <li>Nyisd meg ezt az oldalt Safariban.</li>
          <li>Koppints alul a Megosztás gombra (négyzet felfelé mutató nyíllal).</li>
          <li>
            Válaszd: <strong className="text-foreground">„Főképernyőhöz adás”</strong>, majd „Hozzáadás”.
          </li>
          <li>Nyisd meg a ChairTime-ot a kezdőképernyőről – így értesítéseket is kaphatsz.</li>
        </ol>
      )}
    </div>
  );
}
