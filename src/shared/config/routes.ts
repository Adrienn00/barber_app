/** Az app összes útvonala egy helyen (spec v1.1, 10. fejezet). */
export const ROUTES = {
  home: "/",
  status: "/allapot",
  login: "/belepes",
  register: "/regisztracio",
  authCallback: "/auth/callback",
  /** Belépés után ide megyünk: új kérésben (már élő bejelentkezéssel) dönti el, hova tovább */
  afterLogin: "/auth/tovabb",
  profile: "/profil",
  becomeBarber: "/barber-leszek",
  barbers: "/barberek",
  myBookings: "/foglalasaim",
  barberCalendar: "/naptar",
  barberRequests: "/keresek",
  barberSettings: "/beallitasok",
  platform: "/platform",
  /** Az egység vezetőjének oldala: adatok, tagok, meghívók, áttekintés */
  myShop: "/egysegem",
  /** Meghívó elfogadása: /meghivas/[token] */
  invite: "/meghivas",
  /** Egység nyilvános oldala: /u/[slug] */
  shopPage: "/u",
  privacy: "/adatvedelem",
  terms: "/aszf",
} as const;

/** Ezekhez bejelentkezés kell (a proxy átirányít a belépésre). A szerepkört az oldal ellenőrzi. */
export const PROTECTED_PREFIXES = [
  ROUTES.profile,
  ROUTES.myBookings,
  ROUTES.barberCalendar,
  ROUTES.barberRequests,
  ROUTES.barberSettings,
  ROUTES.platform,
  ROUTES.myShop,
  ROUTES.invite,
];

/** Bejelentkezett felhasználónak nincs itt dolga (a proxy továbbküldi). */
export const GUEST_ONLY_ROUTES = [ROUTES.login, ROUTES.register];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Csak az appon belüli visszatérési cím fogadható el (nyílt átirányítás ellen).
 * Pl. "/barber-leszek" → rendben, "https://gonosz.hu" vagy "//gonosz.hu" → null.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** A belépés utáni továbbirányító címe (a kért visszatérési útvonallal) */
export function afterLoginPath(next?: string | null): string {
  return next ? `${ROUTES.afterLogin}?next=${encodeURIComponent(next)}` : ROUTES.afterLogin;
}

/** Belépési oldal címe visszatérési útvonallal */
export function loginPath(next?: string): string {
  return next ? `${ROUTES.login}?next=${encodeURIComponent(next)}` : ROUTES.login;
}
