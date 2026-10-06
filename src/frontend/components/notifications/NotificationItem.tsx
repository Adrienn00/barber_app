import Link from "next/link";
import type { AppNotification } from "@/backend/notifications/notifications.service";
import { formatDateTimeHu } from "@/shared/datetime/datetime";

/** Egy értesítés a listában: cím, szöveg, idő; az olvasatlan kiemelve. Koppintásra a kapcsolódó oldalra visz. */
export function NotificationItem({ notification }: { notification: AppNotification }) {
  const unread = !notification.isRead;
  return (
    <Link
      href={notification.url}
      className={`block rounded-xl border p-4 transition hover:border-brass ${
        unread ? "border-brass/60 bg-brass/10" : "border-line bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          {unread && <span aria-label="új" className="mr-2 inline-block size-2 rounded-full bg-brass align-middle" />}
          {notification.title}
        </p>
        <time className="shrink-0 text-xs text-muted" dateTime={notification.createdAt}>
          {formatDateTimeHu(notification.createdAt).replace(/^\d{4}\. /, "")}
        </time>
      </div>
      {notification.body && <p className="mt-1 text-sm text-muted">{notification.body}</p>}
    </Link>
  );
}
