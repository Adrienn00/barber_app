import { LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";
import { LiveRefresh } from "@/frontend/components/requests/LiveRefresh";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { UserMenu, type UserMenuUser } from "./UserMenu";

/** Az oldal teteje: logó bal oldalt, jobb oldalt belépés gomb vagy a felhasználói menü. */
type AppHeaderProps = {
  user: (UserMenuUser & { id: string; unreadNotifications: number }) | null;
  barberId: string | null;
};

export function AppHeader({ user, barberId }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5">
        <Logo />
        {/* Barbernél: új kérés / lemondás esetén frissül a menü számjelzője (és a nyitott oldal) */}
        {barberId && <LiveRefresh filter={`barber_id=eq.${barberId}`} />}
        {/* Új értesítéskor frissül a harang számjelzője */}
        {user && <LiveRefresh filter={`user_id=eq.${user.id}`} tables={["notifications"]} />}
        {user ? (
          <div className="flex items-center gap-2">
            <NotificationBell unread={user.unreadNotifications} />
            <UserMenu user={user} />
          </div>
        ) : (
          <LinkButton href={ROUTES.login} variant="secondary" className="min-h-11 px-4 text-sm">
            Belépés
          </LinkButton>
        )}
      </div>
    </header>
  );
}
