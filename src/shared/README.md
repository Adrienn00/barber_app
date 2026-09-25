# shared/ – közös kód (frontend és backend is használja)

| Mappa | Mi van benne |
| --- | --- |
| `config/` | `env.ts` – környezeti változók (Supabase cím, kulcs) beolvasása |
| `datetime/` | `datetime.ts` – dátumformázás magyarul, bukaresti időzóna, óraátállítás; mellette a tesztje |
| `types/` | `database.types.ts` – az adatbázis táblák típusai. **Generált fájl, ne szerkeszd kézzel:** `npm run db:types` |

Ide csak olyan kód kerül, ami biztonságosan futhat a böngészőben is (nincs titkos kulcs).
