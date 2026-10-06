import "server-only";
import webpush from "web-push";

// =============================================================================
// Push csatorna (Web Push, VAPID). A titkos kulcs csak itt, szerveroldalon van.
// =============================================================================

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag: string };
/** sent: kiment; gone: a feliratkozás már nem él (törölni kell); failed: később újra */
export type PushResult = "sent" | "gone" | "failed";

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export async function sendPush(target: PushTarget, message: PushMessage): Promise<PushResult> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(message),
      { TTL: 24 * 3600, urgency: "high" },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    // 404 / 410: a böngésző visszavonta a feliratkozást → töröljük (spec 9.)
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}
