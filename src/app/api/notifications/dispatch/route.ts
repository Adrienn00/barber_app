import { timingSafeEqual } from "node:crypto";
import { dispatchPendingNotifications } from "@/backend/notifications/notifications.service";

// POST /api/notifications/dispatch – a push-küldő. Csak az adatbázis hívja (pg_net), titkos kulccsal.
export async function POST(request: Request) {
  const expected = process.env.NOTIFY_DISPATCH_SECRET ?? "";
  const given = request.headers.get("x-dispatch-secret") ?? "";
  const ok =
    expected.length > 0 &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return Response.json({ error: "Nincs jogosultság." }, { status: 401 });

  return Response.json(await dispatchPendingNotifications());
}
