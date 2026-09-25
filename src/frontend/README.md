# frontend/ – amit a felhasználó lát

| Mappa | Mi van benne |
| --- | --- |
| `components/ui/` | Általános építőkockák, bárhol használhatók: `Button`/`LinkButton`, `SubmitButton`, `TextField`, `TextArea`, `Checkbox`, `Alert`, `Badge`, `Card`, `Divider`, `Eyebrow` (kis arany felirat), `Icon` (ikonok), `StatusRow` |
| `components/layout/` | Oldalkeretek: `AppHeader` (felső sáv), `Logo`, `UserMenu` (lenyíló menü), `PageContainer` (tartalom oszlop), `PageHeader` (cím) |
| `components/home/` | Kezdőlap: `HomeHero` (nyitó rész), `FeatureRow` (ikonos információs sor) |
| `components/auth/` | Belépés/regisztráció: `LoginForm`, `RegisterForm`, `GoogleSignInButton`, `TermsCheckbox` |
| `components/profile/` | `ProfileForm` (név, telefon) |
| `components/barber/` | Barberjelentkezés: `BarberApplicationForm`, `ApplicationStatusCard`, `BarberStatusBadge`, `BecomeBarberIntro` |
| `components/admin/` | Platform admin: `StatsGrid`, `BarberAdminCard`, `BarberDetails`, `BarberStatusActions` |
| `components/system/` | `SystemStatusCard` (az `/allapot` oldalhoz) |
| `styles/` | `globals.css` (**az összes szín egy helyen**), `fonts.ts` (Oswald címekhez, Inter szöveghez) |
| `lib/` | Böngészőben futó segédkód, pl. `supabase-browser.ts` (élő frissítéshez) |

**Szabályok**
- Egy fájl = egy komponens, a fájl neve = a komponens neve (`Card.tsx` → `Card`).
- A komponens nem kér le adatot közvetlenül: az oldal (`app/`) adja át neki props-ként.
  Űrlapoknál a komponens a backend `*.actions.ts` függvényét hívja.
- A `"use client"` a fájl elején azt jelenti, hogy a komponens a böngészőben is fut (gépelésre, kattintásra reagál).
- Minden felirat magyar.
