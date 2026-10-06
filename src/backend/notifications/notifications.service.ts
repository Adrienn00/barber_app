import "server-only";
import { createAdminClient } from "@/backend/core/admin-client";
import { createClient } from "@/backend/core/server-client";
import * as q from "./notifications.queries";
import { type PushTarget, isPushConfigured, sendPush } from "./notifications.push";

// =============================================================================
// Értesítések: appon belüli lista, olvasottság, push-feliratkozás, és a push-küldő (dispatch).
// Az e-mail csatorna (notifications.email.ts) a 8. fázisig ki van kapcsolva.
// =============================================================================

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string;
  isRead: boolean;
  createdAt: string;
};

export async function listMyNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const { data } = await q.selectMyNotifications(await createClient(), userId, limit);
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    url: safeUrl((n.data as { url?: string } | null)?.url),
    isRead: n.read_at !== null,
    createdAt: n.created_at,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count } = await q.countUnread(await createClient(), userId);
  return count ?? 0;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await q.markAllRead(await createClient(), userId);
}

export async function savePushSubscription(endpoint: string, p256dh: string, auth: string): Promise<boolean> {
  const { error } = await q.savePushSubscription(await createClient(), endpoint, p256dh, auth);
  return !error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await q.deletePushSubscription(await createClient(), endpoint);
}

/** Próba értesítés a felhasználónak magának (a beállítás ellenőrzéséhez) */
export async function sendTestNotification(userId: string): Promise<boolean> {
  const { error } = await q.insertNotification(createAdminClient(), {
    user_id: userId,
    type: "test",
    title: "Próba értesítés",
    body: "Ha ezt látod, az értesítések működnek ezen az eszközön.",
    data: { url: "/ertesitesek" },
  });
  return !error;
}

/** Csak az appon belüli útvonal lehet cél (külső linkre nem visz az értesítés) */
function safeUrl(url: string | undefined): string {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/ertesitesek";
}

export type DispatchResult = { claimed: number; sent: number; removed: number; retry: number };

/**
 * A kiküldendő értesítések elküldése push-on minden eszközre, ahol a címzett feliratkozott.
 * Az adatbázis hívja (új értesítéskor és percenként), titkos kulccsal védett végponton át.
 */
export async function dispatchPendingNotifications(): Promise<DispatchResult> {
  const result: DispatchResult = { claimed: 0, sent: 0, removed: 0, retry: 0 };
  if (!isPushConfigured()) return result;

  const admin = createAdminClient();
  const { data: notes } = await q.claimPushNotifications(admin, 100);
  if (!notes?.length) return result;
  result.claimed = notes.length;

  const { data: subs } = await q.selectSubscriptionsOf(admin, [...new Set(notes.map((n) => n.user_id))]);
  const byUser = new Map<string, (PushTarget & { id: string })[]>();
  for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  const gone = new Set<string>();
  const retry: string[] = [];
  await Promise.all(
    notes.map(async (n) => {
      const targets = byUser.get(n.user_id) ?? [];
      const message = {
        title: n.title,
        body: n.body ?? "",
        url: safeUrl((n.data as { url?: string } | null)?.url),
        tag: n.id,
      };
      const outcomes = await Promise.all(targets.map((t) => sendPush(t, message)));
      outcomes.forEach((o, i) => {
        if (o === "sent") result.sent++;
        if (o === "gone") gone.add(targets[i].id);
      });
      // Ha egyik eszközre sem ment ki (de lett volna hova), később újrapróbáljuk
      if (targets.length && outcomes.every((o) => o === "failed")) retry.push(n.id);
    }),
  );

  if (gone.size) await q.deleteSubscriptionsById(admin, [...gone]);
  if (retry.length) await q.releasePushNotifications(admin, retry);
  result.removed = gone.size;
  result.retry = retry.length;
  return result;
}
