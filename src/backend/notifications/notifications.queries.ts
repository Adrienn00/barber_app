import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { Database } from "@/shared/types/database.types";

// =============================================================================
// Értesítések – Supabase-hívások. Az értesítéseket az adatbázis hozza létre (triggerek, időzítő);
// a felhasználó csak a sajátjait olvassa és jelöli olvasottnak.
// =============================================================================

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

export function selectMyNotifications(db: DbClient, userId: string, limit: number) {
  return db
    .from("notifications")
    .select("id, type, title, body, data, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export function countUnread(db: DbClient, userId: string) {
  return db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
}

export function markAllRead(db: DbClient, userId: string) {
  return db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}

export function savePushSubscription(db: DbClient, endpoint: string, p256dh: string, auth: string) {
  return db.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth });
}

/** A saját feliratkozás törlése (az RLS miatt másét nem lehet) */
export function deletePushSubscription(db: DbClient, endpoint: string) {
  return db.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

// --- Csak a teljes jogú (admin) klienssel -------------------------------------

/** Kiküldendő értesítések lefoglalása (párhuzamos futásnál sem megy ki kétszer) */
export function claimPushNotifications(admin: DbClient, limit: number) {
  return admin.rpc("claim_push_notifications", { p_limit: limit });
}

/** Sikertelen küldés: vissza a sorba (legfeljebb 5 próbálkozásig) */
export function releasePushNotifications(admin: DbClient, ids: string[]) {
  return admin.from("notifications").update({ push_sent_at: null }).in("id", ids);
}

export function selectSubscriptionsOf(admin: DbClient, userIds: string[]) {
  return admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
}

export function deleteSubscriptionsById(admin: DbClient, ids: string[]) {
  return admin.from("push_subscriptions").delete().in("id", ids);
}

export function insertNotification(admin: DbClient, row: NotificationInsert) {
  return admin.from("notifications").insert(row);
}
