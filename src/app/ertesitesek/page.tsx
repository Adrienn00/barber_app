import type { Metadata } from "next";
import { requireUser } from "@/backend/auth/auth.service";
import { listMyNotifications } from "@/backend/notifications/notifications.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { MarkAllRead } from "@/frontend/components/notifications/MarkAllRead";
import { NotificationItem } from "@/frontend/components/notifications/NotificationItem";
import { PushSettings } from "@/frontend/components/notifications/PushSettings";
import { Alert } from "@/frontend/components/ui/Alert";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Értesítések" };

// /ertesitesek – az appon belüli értesítések (legújabb elöl) és a push be-/kikapcsolása ezen az eszközön.
// Megnyitáskor minden olvasott lesz; élőben frissül (a fejléc figyeli az új értesítéseket).
export default async function NotificationsPage() {
  const user = await requireUser(ROUTES.notifications);
  const notifications = await listMyNotifications(user.id);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Fiókom" title="Értesítések" />
      <MarkAllRead hasUnread={notifications.some((n) => !n.isRead)} />
      <PushSettings />

      <section className="space-y-3">
        {notifications.length === 0 ? (
          <Alert tone="info">Még nincs értesítésed. Itt jelenik meg minden, ami a foglalásaiddal történik.</Alert>
        ) : (
          notifications.map((n) => <NotificationItem key={n.id} notification={n} />)
        )}
      </section>
    </PageContainer>
  );
}
