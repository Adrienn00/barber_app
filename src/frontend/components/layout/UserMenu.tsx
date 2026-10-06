"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOutAction } from "@/backend/auth/auth.actions";
import { ROUTES } from "@/shared/config/routes";

export type UserMenuUser = {
  name: string;
  isAdmin: boolean;
  isApprovedBarber: boolean;
  /** Barbernél: jóváhagyásra váró kérések száma */
  pendingCount: number;
};

/** Lenyíló menü a bejelentkezett felhasználónak – szerepkör szerinti menüpontokkal. */
export function UserMenu({ user }: { user: UserMenuUser }) {
  // Oldalváltáskor csukódjon be a menü
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  const links = [
    ...(user.isApprovedBarber
      ? [
          { href: ROUTES.barberCalendar, label: "Naptáram" },
          {
            href: ROUTES.barberRequests,
            label: "Függő kérések",
            count: user.pendingCount,
          },
          { href: ROUTES.barberSettings, label: "Szolgáltatásaim és árak" },
          { href: ROUTES.myShop, label: "Egységem" },
        ]
      : []),
    ...(user.isAdmin ? [{ href: ROUTES.platform, label: "Platform admin" }] : []),
    ...(!user.isApprovedBarber ? [{ href: ROUTES.becomeBarber, label: "Barber vagyok" }] : []),
    { href: ROUTES.myBookings, label: "Foglalásaim" },
    { href: ROUTES.profile, label: "Profilom" },
  ] as { href: string; label: string; count?: number }[];

  return (
    <details ref={menuRef} className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-line px-3 text-sm hover:border-brass">
        <span className="flex size-6 items-center justify-center rounded-full bg-brass text-xs font-bold text-background">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-32 truncate">{user.name}</span>
        {user.pendingCount > 0 && (
          <span
            aria-label={`${user.pendingCount} függő kérés`}
            className="flex min-w-5 items-center justify-center rounded-full bg-pending px-1.5 text-xs font-bold text-background"
          >
            {user.pendingCount}
          </span>
        )}
        <span aria-hidden className="text-muted transition group-open:rotate-180">▾</span>
      </summary>
      <nav className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-surface-2 shadow-xl">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="flex items-center justify-between px-4 py-3 hover:bg-line">
            {link.label}
            {link.count ? (
              <span className="rounded-full bg-pending px-2 text-xs font-bold text-background">{link.count}</span>
            ) : null}
          </Link>
        ))}
        <form action={signOutAction} className="border-t border-line">
          <button type="submit" className="w-full px-4 py-3 text-left text-muted hover:bg-line hover:text-foreground">
            Kijelentkezés
          </button>
        </form>
      </nav>
    </details>
  );
}
