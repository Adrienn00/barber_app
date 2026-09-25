import Link from "next/link";
import { LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";
import { UserMenu, type UserMenuUser } from "./UserMenu";

/** Az oldal teteje: logó bal oldalt, jobb oldalt belépés gomb vagy a felhasználói menü. */
export function AppHeader({ user }: { user: UserMenuUser | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Link href={ROUTES.home} className="font-serif text-xl font-bold">
          Barber<span className="text-brass">.</span>
        </Link>
        {user ? (
          <UserMenu user={user} />
        ) : (
          <LinkButton href={ROUTES.login} variant="secondary" className="min-h-10 px-4 text-sm">
            Belépés
          </LinkButton>
        )}
      </div>
    </header>
  );
}
