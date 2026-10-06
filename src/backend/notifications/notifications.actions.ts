"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/backend/auth/auth.service";
import {
  markAllNotificationsRead,
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "./notifications.service";

type SubscriptionJson = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/** Ezen az eszközön bekapcsolja a push-értesítést (a böngésző feliratkozását menti) */
export async function savePushSubscriptionAction(subscription: SubscriptionJson): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  const { endpoint, keys } = subscription;
  if (!user || !endpoint || !keys?.p256dh || !keys.auth) return { ok: false };
  return { ok: await savePushSubscription(endpoint, keys.p256dh, keys.auth) };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<void> {
  if (!(await getCurrentUser())) return;
  await removePushSubscription(endpoint);
}

export async function sendTestNotificationAction(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const ok = await sendTestNotification(user.id);
  revalidatePath("/", "layout");
  return { ok };
}

/** Az „Értesítések” oldal megnyitásakor: minden olvasott (a harang számjelzője eltűnik) */
export async function markAllReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
}
