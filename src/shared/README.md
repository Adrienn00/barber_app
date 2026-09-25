# shared/ – közös kód (frontend és backend is használja)

| Mappa / fájl | Mi van benne |
| --- | --- |
| `config/env.ts` | Környezeti változók (Supabase cím, kulcs) beolvasása |
| `config/routes.ts` | **Az összes útvonal egy helyen** (`ROUTES`), mely oldalak védettek, biztonságos visszatérési cím |
| `datetime/` | Dátumformázás magyarul, bukaresti időzóna, óraátállítás – mellette a tesztje |
| `validation/forms.ts` | Űrlapok ellenőrzése magyar hibaüzenetekkel (belépés, regisztráció, profil, barberjelentkezés) |
| `validation/phone.ts` | Telefonszám egységesítése (`0745…` → `+40745…`) és szép megjelenítése |
| `validation/slug.ts` | Barberlink javaslat névből (`Kovács Péter` → `kovacs-peter`) és ellenőrzése |
| `types/database.types.ts` | Az adatbázis táblák típusai. **Generált fájl, ne szerkeszd kézzel:** `npm run db:types` |
| `types/domain.ts` | Rövid nevű közös típusok (pl. `BarberStatus`) |
| `types/form.ts` | Az űrlap-válasz formája (`FormState`: hiba, mezőhibák, siker) |

Ide csak olyan kód kerül, ami biztonságosan futhat a böngészőben is (nincs titkos kulcs, nincs adatbázis-hívás).
