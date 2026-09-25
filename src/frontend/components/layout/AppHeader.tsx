import { LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";
import { Logo } from "./Logo";
import { UserMenu, type UserMenuUser } from "./UserMenu";

/** Az oldal teteje: logó bal oldalt, jobb oldalt belépés gomb vagy a felhasználói menü. */
export function AppHeader({ user }: { user: UserMenuUser | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5">
        <Logo />
        {user ? (
          <UserMenu user={user} />
        ) : (
          <LinkButton href={ROUTES.login} variant="secondary" className="min-h-11 px-4 text-sm">
            Belépés
          </LinkButton>
        )}
      </div>
    </header>
  );
}
