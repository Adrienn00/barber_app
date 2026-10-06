"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
} from "@/backend/notifications/notifications.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { getPushSubscription, isIos, isPushSupported, isStandalone, subscribeToPush } from "@/frontend/lib/push";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

/**
 * Push-értesítés be-/kikapcsolása EZEN az eszközön, próba értesítéssel.
 * iPhone-on csak a kezdőképernyőre tett appban működik – erről rövid útmutatót mutat.
 */
export function PushSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    (async () => {
      let next: Status;
      if (isIos() && !isStandalone()) next = "ios-install";
      else if (!isPushSupported()) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else next = (await getPushSubscription()) ? "on" : "off";
      if (active) setStatus(next);
    })();
    return () => {
      active = false;
    };
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const subscription = await subscribeToPush();
        if (!subscription) {
          setStatus(Notification.permission === "denied" ? "denied" : "off");
          return;
        }
        const { ok } = await savePushSubscriptionAction(subscription.toJSON());
        if (!ok) throw new Error();
        setStatus("on");
        setMessage({ tone: "success", text: "Bekapcsolva – ezen az eszközön értesítést kapsz." });
      } catch {
        setMessage({ tone: "error", text: "Nem sikerült bekapcsolni. Próbáld újra, vagy nézd meg a böngésző beállításait." });
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      const subscription = await getPushSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
      setMessage({ tone: "info", text: "Kikapcsolva ezen az eszközön. Az appban továbbra is látod az értesítéseket." });
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const { ok } = await sendTestNotificationAction();
      setMessage(
        ok
          ? { tone: "success", text: "Próba értesítés elküldve – néhány másodpercen belül megjelenik." }
          : { tone: "error", text: "Nem sikerült elküldeni." },
      );
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-xl font-bold">Értesítés a telefonodra</h2>

      {status === "loading" && <p className="text-muted">Ellenőrzés…</p>}

      {status === "unsupported" && (
        <p className="text-muted">Ez a böngésző nem tud értesítést küldeni. Az értesítéseidet itt, az appban látod.</p>
      )}

      {status === "ios-install" && (
        <div className="space-y-2">
          <p>iPhone-on az értesítéshez tedd az appot a kezdőképernyőre:</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Nyisd meg ezt az oldalt Safariban.</li>
            <li>Koppints alul a Megosztás gombra (négyzet felfelé mutató nyíllal).</li>
            <li>Válaszd: „Főképernyőhöz adás”.</li>
            <li>Nyisd meg a ChairTime-ot a kezdőképernyőről, és itt kapcsold be az értesítést.</li>
          </ol>
          <p className="text-sm text-muted">iOS 16.4 vagy újabb kell hozzá.</p>
        </div>
      )}

      {status === "denied" && (
        <p className="text-muted">
          Az értesítéseket letiltottad ennél az oldalnál. A böngésző (vagy a telefon) beállításaiban engedélyezd, majd
          töltsd újra az oldalt.
        </p>
      )}

      {status === "off" && (
        <>
          <p className="text-muted">Kapj azonnal értesítést, ha a foglalásaiddal történik valami – akkor is, ha az app zárva van.</p>
          <Button onClick={enable} disabled={busy}>
            {busy ? "Bekapcsolás…" : "Értesítések bekapcsolása"}
          </Button>
        </>
      )}

      {status === "on" && (
        <>
          <p className="text-ok">Bekapcsolva ezen az eszközön.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={test} disabled={busy}>
              Próba értesítés
            </Button>
            <Button variant="ghost" onClick={disable} disabled={busy}>
              Kikapcsolás
            </Button>
          </div>
        </>
      )}

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </section>
  );
}
