import Link from "next/link";
import { Icon } from "@/frontend/components/ui/Icon";
import { ROUTES } from "@/shared/config/routes";

/** Harang a fejlécben: az olvasatlan értesítések száma, koppintásra az értesítések oldala. */
export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href={ROUTES.notifications}
      aria-label={unread ? `Értesítések (${unread} új)` : "Értesítések"}
      className="relative flex size-10 items-center justify-center rounded-lg border border-line hover:border-brass"
    >
      <Icon name="bell" size={20} />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-brass px-1 text-xs font-bold text-background">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
